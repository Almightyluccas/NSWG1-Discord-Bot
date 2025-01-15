import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { config } from 'dotenv';
import mysql from 'mysql2'; // Using mysql2 for connection
import database, {FormIdsTable} from './utils/database';
import request_perscom, { acceptedUsers, Form1Submission } from './utils/request_perscom';
import { exec } from 'child_process';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const HEROKU_APP_NAME = 'nswg1-discord-bot';

config();

async function runBot() {
    const TOKEN = process.env.DISCORD_TOKEN;
    const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
    const NEW_SUBMISSIONS_CHANNEL_ID = process.env.NEW_SUBMISSIONS_CHANNEL_ID
    const DB_USERNAME = process.env.DB_USERNAME;
    const DB_PASSWORD = process.env.DB_PASSWORD;
    const DB_HOST = process.env.DB_HOST;
    const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
    const DB_NAME = process.env.DB_NAME;
    const BEARER_TOKEN = process.env.BEARER_TOKEN_PERSCOM;


    if (!TOKEN) {
        console.error('Error: DISCORD_TOKEN not found in the environment.');
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

        const newSubmissionsChannel = client.channels.cache.get(NEW_SUBMISSIONS_CHANNEL_ID!) as TextChannel;

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



                    const oldSubmissions: FormIdsTable[] = await database.getFormsIdsTable(connection)
                    const newSubmissions: Form1Submission[] = data.filter(
                        (newForm: Form1Submission) => !oldSubmissions.some((oldForm: FormIdsTable) => oldForm.form_id === newForm.form_id)
                    );

                    if (newSubmissions.length !== 0) {
                        await database.putFormIdsTable(connection, newSubmissions);

                        const positionZeroCount = newSubmissions.filter(submission => submission.preferred_position === 0).length;
                        const otherPositionsCount = newSubmissions.filter(submission => submission.preferred_position !== 0).length;

                        const applicationUrl = "https://nswg-1.com/admin/perscom/submissions?form=Enlistment%20Application"; // Replace with actual URL

                        const reviewButton = new ButtonBuilder()
                            .setLabel('View Applications')
                            .setStyle(ButtonStyle.Link)
                            .setURL(applicationUrl);

                        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(reviewButton);

                        if (positionZeroCount > 0) {
                            const positionZeroMessage =
                                positionZeroCount === 1
                                    ? `<@667833642248175673> <@492142030831616010> There is a new application. Please review it.`
                                    : `<@667833642248175673> <@492142030831616010> There are ${positionZeroCount} new applications. Please review them.`;

                            await newSubmissionsChannel.send({
                                content: positionZeroMessage,
                                components: [actionRow],
                            });
                        }

                        if (otherPositionsCount > 0) {
                            const otherPositionsMessage =
                                otherPositionsCount === 1
                                    ? `<@249242679211196417> There is a new application. Please review it.`
                                    : `<@249242679211196417> There are ${otherPositionsCount} new applications. Please review them.`;

                            await newSubmissionsChannel.send({
                                content: otherPositionsMessage,
                                components: [actionRow],
                            });
                        }
                    }


                    const acceptedUsersDatabase: acceptedUsers[] = await database.getUsersDatabase(connection);
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
                        console.error('Guild not found.');
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
            console.error('An error occurred:', error);
        }
    }

    // Handle exit signals like Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('Received shutdown signal. Shutting down...');
        client.destroy(); // Disconnect the bot
        process.exit(0); // Exit the process
    });

    client.login(TOKEN);

    return client;
}

function shutDownBot(client: Client) {
    console.log('Shutting down the bot...');

    // Destroy the Discord client to stop the bot
    client.destroy();

    // Stop Heroku dyno worker
    exec(`heroku ps:scale worker=0 --app ${HEROKU_APP_NAME}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error scaling down dyno: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.log('Bot shut down successfully.');
    });
}

async function main() {
    try {
        const client = await runBot();

        // Example: Shutdown the bot after 1 minute
        setTimeout(() => {
            shutDownBot(client); // Pass the client to the shutdown function
        }, 60000); // Adjust the time as needed
    } catch (error) {
        console.error('An error occurred in the bot:', error);
        process.exit(1);
    }
}

main();