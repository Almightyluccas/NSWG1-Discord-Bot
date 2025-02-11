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
            
            for (const guild of client.guilds.cache.values()) {
                console.log(`\nServer: ${guild.name} (ID: ${guild.id})`);
                console.log(`Member count from cache: ${guild.memberCount}`);
                
                try {
                    const members = await guild.members.fetch();
                    console.log(`Successfully fetched ${members.size} members for ${guild.name}`);
                    members.forEach(member => {
                        if (member.nickname) {
                            console.log(`Cached nickname for ${member.user.tag}: ${member.nickname}`);
                        }
                    });
                } catch (error) {
                    console.error(`Failed to fetch members for guild ${guild.name}:`, error);
                }
            }
        });

        client.on('guildCreate', async (guild) => {
            console.log(`Bot joined a new server: ${guild.name} (ID: ${guild.id})`);
            try {
                const members = await guild.members.fetch();
                console.log(`Cached ${members.size} members for new server ${guild.name}`);
            } catch (error) {
                console.error(`Failed to cache members for new server ${guild.name}:`, error);
            }
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