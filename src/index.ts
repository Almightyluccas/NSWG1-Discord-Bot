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
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.MessageContent 
            ],
        });

        await applicationBot(client);
        await commandBot(client);

        await client.login(config.DISCORD_TOKEN);

        const shutdown = () => {
            console.log('Shutting down gracefully...');
            client.destroy();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        console.error('Fatal error occurred:', error);
        process.exit(1);
    }
}

main().then(() => {
    console.log('Bot started successfully')
}).catch(e => console.error('Error starting bot:', e));