import {Client} from "discord.js";
import mysql, {Connection} from "mysql2";
import {PerscomService, AcceptedUsers, DeniedUsers, Form1Submission} from "../utils/request_perscom";
import {DatabaseService, FormIdsTable} from "../utils/database";
import {notifyNewApplications} from "../utils/newApplication";
import {notifyAcceptedUsers} from "../utils/acceptedApplication";
import {notifyDeniedUsers} from "../utils/deniedApplication";

export async function runMessageBot(client: Client) {
    const TOKEN = process.env.DISCORD_TOKEN;
    const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
    const NEW_SUBMISSIONS_CHANNEL_ID = process.env.NEW_SUBMISSIONS_CHANNEL_ID;
    const DB_USERNAME = process.env.DB_USERNAME;
    const DB_PASSWORD = process.env.DB_PASSWORD;
    const DB_HOST = process.env.DB_HOST;
    const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
    const DB_NAME = process.env.DB_NAME;
    const BEARER_TOKEN = process.env.BEARER_TOKEN_PERSCOM;

    if (!TOKEN) {
        console.error('Error: DISCORD_TOKEN not found in the environment.');
        process.exit(1);
    }

    client.once('ready', () => {
        console.log(`Bot has logged in as ${client.user?.tag}`);
        setInterval(sendMessageTask, 30000);
    });

    async function sendMessageTask(): Promise <void> {
        const connection: Connection = mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USERNAME,
            password: DB_PASSWORD,
            database: DB_NAME,
        });

        try {
            const perscomService: PerscomService = new PerscomService(BEARER_TOKEN!);
            const databaseService: DatabaseService = new DatabaseService(connection);

            await perscomService.clearCache()

            const data: Form1Submission[] = await perscomService.getAllForm1Data();
            const oldSubmissions: FormIdsTable[] = await databaseService.getFormsIdsTable();
            const newSubmissions: Form1Submission[] = data.filter(
                (newForm: Form1Submission): boolean => !oldSubmissions.some((oldForm: FormIdsTable): boolean => oldForm.form_id === newForm.form_id)
            );

            if (newSubmissions.length !== 0) {
                await databaseService.putFormIdsTable(newSubmissions);
                await notifyNewApplications(newSubmissions, client, NEW_SUBMISSIONS_CHANNEL_ID!);
            }

            const acceptedUsersDatabase: AcceptedUsers[] = await databaseService.getUsersDatabase();
            const acceptedUsers: AcceptedUsers[] = await perscomService.getSubmissionStatus(data, 7);
            const newAcceptedUsers: AcceptedUsers[] = await databaseService.compareAndInsertUsers(
                acceptedUsers,
                acceptedUsersDatabase,
            );

            const deniedUsers: DeniedUsers[] = await perscomService.getSubmissionStatus(data, 8);
            console.log(deniedUsers);

            if (deniedUsers.length > 0) {
                await notifyDeniedUsers(deniedUsers, data, client, CHANNEL_ID!);
                await perscomService.deleteUsers(deniedUsers);
                await databaseService.deleteOldForms(deniedUsers);
            }

            if (newAcceptedUsers.length > 0) {
                await notifyAcceptedUsers(newAcceptedUsers, data, client, CHANNEL_ID!);
            }

            connection.end();
        } catch (error) {
            console.error('An error occurred:', error);
        }
    }

    await client.login(TOKEN);

    return client;
}