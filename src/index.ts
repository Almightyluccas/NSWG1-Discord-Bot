import { applicationBot } from "./bots/applicationBot";
import { Client, GatewayIntentBits } from "discord.js";
import { commandBot } from "./bots/commandBot";
import { serverStatusBot } from "./bots/serverStatusBot";
import { config } from "./config/config";
import { app } from "./services/serverStatusService";

const API_PORT = process.env.PORT || 3000;

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
        await serverStatusBot(client);

        await client.login(config.DISCORD_TOKEN);

        app.listen(API_PORT, () => {
            console.log(`API server listening on port ${API_PORT}`);
        });

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
    console.log('Bot and API server started successfully')
}).catch(e => console.error('Error starting services:', e));