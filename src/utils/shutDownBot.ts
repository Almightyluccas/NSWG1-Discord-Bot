import {Client} from "discord.js";
import {exec} from "child_process";

const HEROKU_APP_NAME = 'nswg1-discord-bot';

export function shutDownBot(client: Client) {
    console.log('Shutting down the bot...');

    client.destroy();

    exec(`heroku ps:scale worker=0 --app ${HEROKU_APP_NAME}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error scaling down dyno: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.log('Bot shut down successfully.');
    });
}