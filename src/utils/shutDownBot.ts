import { Client } from "discord.js";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);
const HEROKU_APP_NAME = 'nswg1-discord-bot';

export async function shutDownBot(client: Client): Promise<void> {
    console.log('Shutting down the bot...');

    await Promise.resolve(client.destroy());

    try {
        const { stdout, stderr } = await execPromise(`heroku ps:scale worker=0 --app ${HEROKU_APP_NAME}`);
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
        console.log('Bot shut down successfully.');
    } catch (error: any) {
        console.error(`Error scaling down dyno: ${error.message}`);
    }
}