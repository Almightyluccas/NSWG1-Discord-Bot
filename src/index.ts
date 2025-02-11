import { config } from 'dotenv';
import { applicationBot } from "./bots/applicationBot";
import { Client, GatewayIntentBits } from "discord.js";

config({ path: '../.env' });

async function main() {
    try {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
            ],
        });

        await applicationBot(client);

        process.on('SIGINT', () => process.exit(0));
        process.on('SIGTERM', () => process.exit(0));

    } catch (error) {
        console.error('An error occurred in the bot:', error);
        process.exit(1);
    }
}

main();