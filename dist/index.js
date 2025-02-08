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
const dotenv_1 = require("dotenv");
const runMessageBot_1 = require("./bots/runMessageBot");
const shutDownBot_1 = require("./utils/shutDownBot");
const discord_js_1 = require("discord.js");
require('newrelic');
(0, dotenv_1.config)({ path: '../.env' });
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = new discord_js_1.Client({
                intents: [
                    discord_js_1.GatewayIntentBits.Guilds,
                    discord_js_1.GatewayIntentBits.GuildMembers,
                    discord_js_1.GatewayIntentBits.GuildMessages,
                ],
            });
            const messageBotClient = yield (0, runMessageBot_1.runMessageBot)(client);
            return { messageBotClient };
        }
        catch (error) {
            console.error('An error occurred in the bot:', error);
            process.exit(1);
        }
    });
}
main().then((client) => __awaiter(void 0, void 0, void 0, function* () {
    const shutdown = () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, shutDownBot_1.shutDownBot)(client.messageBotClient);
        process.exit(0);
    });
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        yield shutdown();
    }), 60000);
}));
