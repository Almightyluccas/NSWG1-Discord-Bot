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

        client.once('ready', async () => {
            console.log(`Bot is ready! Logged in as ${client.user?.tag}`);
            console.log(`Bot is in ${client.guilds.cache.size} servers:`);
            client.guilds.cache.forEach(guild => {
                console.log(`- ${guild.name} (ID: ${guild.id})`);
            });
        });

        client.on('guildCreate', (guild) => {
            console.log(`Bot joined a new server: ${guild.name} (ID: ${guild.id})`);
        });

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