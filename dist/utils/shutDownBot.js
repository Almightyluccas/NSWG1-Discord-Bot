"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutDownBot = shutDownBot;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
const HEROKU_APP_NAME = 'nswg1-discord-bot';
function shutDownBot(client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Shutting down the bot...');
        yield Promise.resolve(client.destroy());
        try {
            const { stdout, stderr } = yield execPromise(`heroku ps:scale worker=0 --app ${HEROKU_APP_NAME}`);
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            console.log(`stdout: ${stdout}`);
            console.log('Bot shut down successfully.');
        }
        catch (error) {
            console.error(`Error scaling down dyno: ${error.message}`);
        }
    });
}
