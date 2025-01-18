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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMessageBot = runMessageBot;
const mysql2_1 = __importDefault(require("mysql2"));
const request_perscom_1 = require("../utils/request_perscom");
const database_1 = require("../utils/database");
const newApplication_1 = require("../utils/newApplication");
const acceptedApplication_1 = require("../utils/acceptedApplication");
const deniedApplication_1 = require("../utils/deniedApplication");
function runMessageBot(client) {
    return __awaiter(this, void 0, void 0, function* () {
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
            var _a;
            console.log(`Bot has logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}`);
            setInterval(sendMessageTask, 30000);
        });
        function sendMessageTask() {
            return __awaiter(this, void 0, void 0, function* () {
                const connection = mysql2_1.default.createConnection({
                    host: DB_HOST,
                    port: DB_PORT,
                    user: DB_USERNAME,
                    password: DB_PASSWORD,
                    database: DB_NAME,
                });
                try {
                    const perscomService = new request_perscom_1.PerscomService(BEARER_TOKEN);
                    const databaseService = new database_1.DatabaseService(connection);
                    yield perscomService.clearCache();
                    const data = yield perscomService.getAllForm1Data();
                    const oldSubmissions = yield databaseService.getFormsIdsTable();
                    const newSubmissions = data.filter((newForm) => !oldSubmissions.some((oldForm) => oldForm.form_id === newForm.form_id));
                    if (newSubmissions.length !== 0) {
                        yield databaseService.putFormIdsTable(newSubmissions);
                        yield (0, newApplication_1.notifyNewApplications)(newSubmissions, client, NEW_SUBMISSIONS_CHANNEL_ID);
                    }
                    const acceptedUsersDatabase = yield databaseService.getUsersDatabase();
                    const acceptedUsers = yield perscomService.getSubmissionStatus(data, 7);
                    const newAcceptedUsers = yield databaseService.compareAndInsertUsers(acceptedUsers, acceptedUsersDatabase);
                    const deniedUsers = yield perscomService.getSubmissionStatus(data, 8);
                    console.log(deniedUsers);
                    if (deniedUsers.length > 0) {
                        yield (0, deniedApplication_1.notifyDeniedUsers)(deniedUsers, data, client, CHANNEL_ID);
                        yield perscomService.deleteUsers(deniedUsers);
                    }
                    if (newAcceptedUsers.length > 0) {
                        yield (0, acceptedApplication_1.notifyAcceptedUsers)(newAcceptedUsers, data, client, CHANNEL_ID);
                    }
                    connection.end();
                }
                catch (error) {
                    console.error('An error occurred:', error);
                }
            });
        }
        yield client.login(TOKEN);
        return client;
    });
}
