import { Client } from "discord.js";
import mysql from "mysql2";
import { PerscomService } from "../services/request_perscom";
import { DatabaseService } from "../services/database";
import { NotificationService } from "../services/notificationService";
import { config } from "../config/config";

// Optimized pool configuration with reasonable defaults
const pool = mysql.createPool({
    host: config.APPLICATION_DB.host,
    port: config.APPLICATION_DB.port,
    user: config.APPLICATION_DB.username,
    password: config.APPLICATION_DB.password,
    database: config.APPLICATION_DB.database,
    waitForConnections: true,
    connectionLimit: 5, // Reduced from 10 since the app doesn't need that many
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

const poolPromise = pool.promise();

export async function applicationBot(client: Client): Promise<void> {
    client.once("ready", () => {
        console.log(`Application Bot has logged in as ${client.user?.tag}`);
        setInterval(sendMessageTask, 300000);
        sendMessageTask();
    });

    const notificationService = new NotificationService(client, config.APPLICATION_DISCORD_CHANNEL_ID, config.NEW_APPLICATION_CHANNEL_ID);

    async function sendMessageTask(): Promise<void> {
        let connection;
        try {
            connection = await poolPromise.getConnection();
            const perscomService = new PerscomService(config.BEARER_TOKEN_PERSCOM);
            const databaseService = new DatabaseService(connection);

            await perscomService.clearCache();
            const data = await perscomService.getAllForm1Data();
            
            const oldSubmissions = await databaseService.getFormsIdsTable();
            const newSubmissions = data.filter(
                newForm => !oldSubmissions.some(oldForm => oldForm.form_id === newForm.form_id)
            );

            if (newSubmissions.length > 0) {
                await databaseService.putFormIdsTable(newSubmissions);
                await notificationService.notifyNewApplications(newSubmissions);
            }

            const [acceptedUsersDatabase, acceptedUsers] = await Promise.all([
                databaseService.getUsersDatabase(),
                perscomService.getSubmissionStatus(data, 7)
            ]);

            const newAcceptedUsers = await databaseService.compareAndInsertUsers(acceptedUsers, acceptedUsersDatabase);
            const deniedUsers = await perscomService.getSubmissionStatus(data, 8);

            if (deniedUsers.length > 0) {
                await notificationService.notifyDeniedUsers(deniedUsers, data);
                await perscomService.deleteUsers(deniedUsers);
                await databaseService.deleteOldForms(deniedUsers);
            }

            if (newAcceptedUsers.length > 0) {
                await notificationService.notifyAcceptedUsers(newAcceptedUsers, data);
            }

        } catch (error) {
            console.error('ApplicationBot Error:', error);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}