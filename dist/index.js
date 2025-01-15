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
const discord_js_1 = require("discord.js");
const dotenv_1 = require("dotenv");
const mysql2_1 = __importDefault(require("mysql2")); // Using mysql2 for connection
const database_1 = __importDefault(require("./utils/database"));
const request_perscom_1 = __importDefault(require("./utils/request_perscom"));
(0, dotenv_1.config)({ path: '../.env' });
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME;
const BEARER_TOKEN = process.env.BEARER_TOKEN_PERSCOM;
if (!TOKEN) {
    console.error("Error: DISCORD_TOKEN not found in the environment.");
    process.exit(1);
}
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessages,
    ],
});
client.once('ready', () => {
    var _a;
    console.log(`Bot has logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}`);
    setInterval(sendMessageTask, 30000);
});
function sendMessageTask() {
    return __awaiter(this, void 0, void 0, function* () {
        const channel = client.channels.cache.get(CHANNEL_ID);
        if (!channel) {
            console.error(`Channel with ID ${CHANNEL_ID} not found.`);
            return;
        }
        try {
            request_perscom_1.default
                .fetchAllForm1Data(BEARER_TOKEN)
                .then((data) => __awaiter(this, void 0, void 0, function* () {
                const form1DataMap = new Map(data.map(submission => [submission.user_id, submission.discord_name]));
                const connection = mysql2_1.default.createConnection({
                    host: DB_HOST,
                    port: DB_PORT,
                    user: DB_USERNAME,
                    password: DB_PASSWORD,
                    database: DB_NAME,
                });
                const acceptedUsersDatabase = yield database_1.default.retrieveUsersDatabase(connection);
                const acceptedUsers = yield request_perscom_1.default.extractAcceptedUsers(data, BEARER_TOKEN);
                const newAcceptedUsers = yield database_1.default.compareAndInsertUsers(acceptedUsers, acceptedUsersDatabase, connection);
                const newAcceptedUserDetails = newAcceptedUsers.map(user => (Object.assign(Object.assign({}, user), { discord_name: form1DataMap.get(user.id) || 'Not Found' })));
                const guild = client.guilds.cache.get(channel.guild.id);
                if (!guild) {
                    console.error("Guild not found.");
                    return;
                }
                const discordMembers = yield guild.members.fetch();
                const discordUsers = discordMembers.map(member => ({
                    username: member.user.username,
                    discord_id: member.user.id,
                }));
                const newAcceptedUserDetailsWithDiscordId = newAcceptedUserDetails.map(user => {
                    const discordUser = discordUsers.find(dUser => dUser.username === user.discord_name);
                    return Object.assign(Object.assign({}, user), { discord_id: discordUser ? discordUser.discord_id : 'Not Found' });
                });
                console.log('Mapped users with Discord IDs:', newAcceptedUserDetailsWithDiscordId);
                for (const userDetails of newAcceptedUserDetailsWithDiscordId) {
                    if (userDetails.discord_id !== 'Not Found') {
                        if (userDetails.preferred_position === 0) {
                            yield channel.send(`<@${userDetails.discord_id}> Your application has been accepted please get in touch with <@667833642248175673> or <@492142030831616010> on Discord for an interview.`);
                        }
                        else {
                            yield channel.send(`<@${userDetails.discord_id}> Your application has been accepted please get in touch with <@249242679211196417> on Discord for an interview.`);
                        }
                    }
                    else {
                        yield channel.send(`${userDetails.name}/${userDetails.discord_name} (User not found in Discord) has been accepted.`);
                    }
                }
                connection.end();
            }))
                .catch(error => {
                console.error('Error fetching Form1 data or processing users:', error);
            });
        }
        catch (error) {
            console.error("An error occurred:", error);
        }
    });
}
client.login(TOKEN);
process.exit(0);
