import { Client } from "discord.js";
import mysql from "mysql2";
import { PerscomService, AcceptedUsers, DeniedUsers, Form1Submission } from "../services/request_perscom";
import { DatabaseService, FormIdsTable } from "../services/database";
import { NotificationService } from "../services/notificationService";
import { config } from "../config/config";

const pool = mysql.createPool({
    host: config.APPLICATION_DB_HOST,
    port: config.APPLICATION_DB_PORT,
    user: config.APPLICATION_DB_USERNAME,
    password: config.APPLICATION_DB_PASSWORD,
    database: config.APPLICATION_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const poolPromise = pool.promise();

export async function applicationBot(client: Client): Promise<void> {
    client.once("ready", () => {
        console.log(`Application Bot has logged in as ${client.user?.tag}`);
        console.log('Starting application check scheduler (every 5 minutes)');
        setInterval(sendMessageTask, 300000); 
        sendMessageTask();
    });

    const notificationService = new NotificationService(client, config.APPLICATION_DISCORD_CHANNEL_ID, config.NEW_APPLICATION_CHANNEL_ID);

    async function sendMessageTask(): Promise<void> {
        const startTime = new Date();
        console.log(`[${startTime.toISOString()}] Application Bot: Starting check...`);
        
        let connection;
        try {
            connection = await poolPromise.getConnection();
            const checkStartTime = Date.now();

            const perscomService: PerscomService = new PerscomService(config.BEARER_TOKEN_PERSCOM);
            const databaseService: DatabaseService = new DatabaseService(connection);

            await perscomService.clearCache();
            console.log(`[${new Date().toISOString()}] Cache cleared successfully`);

            const data: Form1Submission[] = await perscomService.getAllForm1Data();
            const oldSubmissions: FormIdsTable[] = await databaseService.getFormsIdsTable();
            const newSubmissions: Form1Submission[] = data.filter(
                (newForm: Form1Submission): boolean =>
                    !oldSubmissions.some(
                        (oldForm: FormIdsTable): boolean => oldForm.form_id === newForm.form_id
                    )
            );

            if (newSubmissions.length !== 0) {
                console.log(`[${new Date().toISOString()}] Found ${newSubmissions.length} new submissions`);
                await databaseService.putFormIdsTable(newSubmissions);
                await notificationService.notifyNewApplications(newSubmissions);
            }

            const acceptedUsersDatabase: AcceptedUsers[] = await databaseService.getUsersDatabase();
            const acceptedUsers: AcceptedUsers[] = await perscomService.getSubmissionStatus(data, 7);
            const newAcceptedUsers: AcceptedUsers[] = await databaseService.compareAndInsertUsers(
                acceptedUsers,
                acceptedUsersDatabase
            );

            const deniedUsers: DeniedUsers[] = await perscomService.getSubmissionStatus(data, 8);
            if (deniedUsers.length > 0) {
                console.log(`[${new Date().toISOString()}] Processing ${deniedUsers.length} denied applications`);
                await notificationService.notifyDeniedUsers(deniedUsers, data);
                await perscomService.deleteUsers(deniedUsers);
                await databaseService.deleteOldForms(deniedUsers);
            }

            if (newAcceptedUsers.length > 0) {
                console.log(`[${new Date().toISOString()}] Processing ${newAcceptedUsers.length} newly accepted applications`);
                await notificationService.notifyAcceptedUsers(newAcceptedUsers, data);
            }

            const checkDuration = Date.now() - checkStartTime;
            console.log(`[${new Date().toISOString()}] Application Bot: Check completed successfully (Duration: ${checkDuration}ms)`);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error during application check:`, error);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}