import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { config } from 'dotenv';
import mysql from 'mysql2'; // Using mysql2 for connection
import database from './utils/database';
import request_perscom, {acceptedUsers, Form1Submission} from "./utils/request_perscom";

config({path: '../.env'});

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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
    ],
});

client.once('ready', () => {
    console.log(`Bot has logged in as ${client.user?.tag}`);
    setInterval(sendMessageTask, 30000);
});

async function sendMessageTask() {
    const channel = client.channels.cache.get(CHANNEL_ID!) as TextChannel;

    if (!channel) {
        console.error(`Channel with ID ${CHANNEL_ID} not found.`);
        return;
    }

    try {

        request_perscom
            .fetchAllForm1Data(BEARER_TOKEN!)
            .then(async (data: Form1Submission[]) => {
                const form1DataMap = new Map(data.map(submission => [submission.user_id, submission.discord_name]));

                const connection = mysql.createConnection({
                    host: DB_HOST,
                    port: DB_PORT,
                    user: DB_USERNAME,
                    password: DB_PASSWORD,
                    database: DB_NAME,
                });
                const acceptedUsersDatabase: acceptedUsers[] = await database.retrieveUsersDatabase(connection);
                const acceptedUsers: acceptedUsers[] = await request_perscom.extractAcceptedUsers(data, BEARER_TOKEN!);
                const newAcceptedUsers: acceptedUsers[] = await database.compareAndInsertUsers(
                    acceptedUsers,
                    acceptedUsersDatabase,
                    connection
                );

                const newAcceptedUserDetails = newAcceptedUsers.map(user => ({
                    ...user,
                    discord_name: form1DataMap.get(user.id) || 'Not Found',
                }));

                const guild = client.guilds.cache.get(channel.guild.id);
                if (!guild) {
                    console.error("Guild not found.");
                    return;
                }
                const discordMembers = await guild.members.fetch();
                const discordUsers = discordMembers.map(member => ({
                    username: member.user.username,
                    discord_id: member.user.id,
                }));

                const newAcceptedUserDetailsWithDiscordId = newAcceptedUserDetails.map(user => {
                    const discordUser = discordUsers.find(dUser => dUser.username === user.discord_name);

                    return {
                        ...user,
                        discord_id: discordUser ? discordUser.discord_id : 'Not Found',
                    };
                });

                console.log('Mapped users with Discord IDs:', newAcceptedUserDetailsWithDiscordId);

                for (const userDetails of newAcceptedUserDetailsWithDiscordId) {
                    if (userDetails.discord_id !== 'Not Found') {
                        if (userDetails.preferred_position === 0) {
                            await channel.send(
                                `<@${userDetails.discord_id}> Your application has been accepted please get in touch with <@667833642248175673> or <@492142030831616010> on Discord for an interview.`
                            );
                        } else {
                            await channel.send(
                                `<@${userDetails.discord_id}> Your application has been accepted please get in touch with <@249242679211196417> on Discord for an interview.`
                            );
                        }
                    } else {
                        await channel.send(
                            `${userDetails.name}/${userDetails.discord_name} (User not found in Discord) has been accepted.`
                        );
                    }
                }
                connection.end();
            })
            .catch(error => {
                console.error('Error fetching Form1 data or processing users:', error);
            });


    } catch (error) {
        console.error("An error occurred:", error);
    }
}

client.login(TOKEN);
