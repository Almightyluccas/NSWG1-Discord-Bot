import { Client } from "discord.js";
import mysql from "mysql2";
import { PerscomService, AcceptedUsers, DeniedUsers, Form1Submission } from "../services/request_perscom";
import { DatabaseService, FormIdsTable } from "../services/database";
import { NotificationService } from "../services/notificationService";
import { config } from "../config/config";

const pool = mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USERNAME,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const poolPromise = pool.promise();

export async function applicationBot(client: Client) {
    const notificationService = new NotificationService(
        client,
        config.DISCORD_CHANNEL_ID,
        config.NEW_SUBMISSIONS_CHANNEL_ID
    );

    client.once("ready", () => {
        console.log(`Application Bot has logged in as ${client.user?.tag}`);
        setInterval(sendMessageTask, 300000);
    });

    async function sendMessageTask(): Promise<void> {
        const startTime = new Date();
        console.log(`Application Bot running check at ${startTime.toLocaleString()}`);
        
        let connection;
        try {
            connection = await poolPromise.getConnection();
        } catch (connError) {
            console.error("Error acquiring connection from pool:", connError);
            return;
        }

        try {
            const perscomService: PerscomService = new PerscomService(config.BEARER_TOKEN_PERSCOM);
            const databaseService: DatabaseService = new DatabaseService(connection);

            await perscomService.clearCache();

            const data: Form1Submission[] = await perscomService.getAllForm1Data();
            const oldSubmissions: FormIdsTable[] = await databaseService.getFormsIdsTable();
            const newSubmissions: Form1Submission[] = data.filter(
                (newForm: Form1Submission): boolean =>
                    !oldSubmissions.some(
                        (oldForm: FormIdsTable): boolean => oldForm.form_id === newForm.form_id
                    )
            );

            if (newSubmissions.length !== 0) {
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
                console.log("Denied Users:", deniedUsers);
                await notificationService.notifyDeniedUsers(deniedUsers, data);
                await perscomService.deleteUsers(deniedUsers);
                await databaseService.deleteOldForms(deniedUsers);
            }

            if (newAcceptedUsers.length > 0) {
                await notificationService.notifyAcceptedUsers(newAcceptedUsers, data);
            }

            console.log(`Application Bot finished check at ${new Date().toLocaleString()}`);
        } catch (error) {
            console.error("Error during sendMessageTask:", error);
        } finally {
            connection.release();
        }
    }

    try {
        await client.login(config.DISCORD_TOKEN);
    } catch (loginError) {
        console.error("Bot failed to login:", loginError);
        process.exit(1);
    }
    return client;
}