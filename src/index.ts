import { config } from 'dotenv';
import { runMessageBot } from "./bots/runMessageBot";
import { shutDownBot } from "./utils/shutDownBot";
import { Client, GatewayIntentBits } from "discord.js";

interface AllClients {
    messageBotClient: Client;
}

config({ path: '../.env' });

async function main(): Promise<AllClients> {
    try {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
            ],
        });
        const messageBotClient = await runMessageBot(client);
        return { messageBotClient };
    } catch (error) {
        console.error('An error occurred in the bot:', error);
        process.exit(1);
    }
}

main().then(async (client: AllClients): Promise<void> => {
    const shutdown = async () => {
        await shutDownBot(client.messageBotClient);
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // setTimeout(async () => {
    //     await shutdown();
    // }, 60000);
});