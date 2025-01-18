"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutDownBot = shutDownBot;
const child_process_1 = require("child_process");
const HEROKU_APP_NAME = 'nswg1-discord-bot';
function shutDownBot(client) {
    console.log('Shutting down the bot...');
    client.destroy();
    (0, child_process_1.exec)(`heroku ps:scale worker=0 --app ${HEROKU_APP_NAME}`, (error, stdout, stderr) => {
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
