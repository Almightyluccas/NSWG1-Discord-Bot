import { applicationBot } from "./bots/applicationBot";
import { Client, GatewayIntentBits } from "discord.js";
import { commandBot } from "./bots/commandBot";
import { config } from "./config/config";

async function main() {
    try {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildPresences 
            ],
        });

        await applicationBot(client);
        await commandBot(client);

        await client.login(config.DISCORD_TOKEN);

        process.on('SIGINT', () => {
            client.destroy();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            client.destroy();
            process.exit(0);
        });

    } catch (error) {
        console.error('An error occurred in the bot:', error);
        process.exit(1);
    }
}

main();