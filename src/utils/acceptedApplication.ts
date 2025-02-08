import {AcceptedUsers, Form1Submission} from "./request_perscom";
import {Client, TextChannel} from "discord.js";

export async function notifyAcceptedUsers(newAcceptedUsers: AcceptedUsers[], data: Form1Submission[], client: Client, channelID: string) {
    try {
        const channel = client.channels.cache.get(channelID) as TextChannel;
        if (!channel) {
            console.error(`Channel with ID ${channelID} not found.`);
            return;
        }

        const form1DataMap = new Map(data.map(submission => [submission.user_id, submission.discord_name]));

        const newAcceptedUserDetails = newAcceptedUsers.map(user => ({
            ...user,
            discord_name: form1DataMap.get(user.id) || 'Not Found',
        }));

        const guild = client.guilds.cache.get(channel.guild.id);
        if (!guild) {
            console.error('Guild not found.');
            return;
        }

        let discordMembers;
        try {
            discordMembers = await guild.members.fetch();
        } catch (err) {
            console.error('Error fetching guild members:', err);
            return;
        }

        const discordUsers = discordMembers.map(member => ({
            username: member.user.username,
            discord_id: member.user.id,
            nickname: member.nickname,
            displayName: member.displayName
        }));

        console.log("Discord Users:", discordUsers);

        const newAcceptedUserDetailsWithDiscordId = newAcceptedUserDetails.map(user => {
            const savedDiscordName = user.discord_name.split(' ')[0];
            let discordUser = discordUsers.find(dUser => dUser.username === savedDiscordName);
            if (!discordUser) {
                discordUser = discordUsers.find(dUser => dUser.nickname === savedDiscordName);
            }
            if (!discordUser) {
                discordUser = discordUsers.find(dUser => dUser.displayName === savedDiscordName);
            }
            return {
                ...user,
                discord_id: discordUser ? discordUser.discord_id : 'Not Found',
            };
        });

        for (const userDetails of newAcceptedUserDetailsWithDiscordId) {
            try {
                if (userDetails.discord_id !== 'Not Found') {
                    if (userDetails.preferred_position === "SO Special Warfare Operator") {
                        await channel.send(
                            `<@${userDetails.discord_id}> Your application has been accepted. Please get in touch with <@667833642248175673> or <@492142030831616010> on Discord for an interview.`
                        );
                    } else {
                        await channel.send(
                            `<@${userDetails.discord_id}> Your application has been accepted. Please get in touch with <@249242679211196417> on Discord for an interview.`
                        );
                    }
                } else {
                    await channel.send(
                        `${userDetails.name}/${userDetails.discord_name} (User not found in Discord) has been accepted.`
                    );
                }
            } catch (sendError) {
                console.error(
                    `Error sending notification for user ${userDetails.name} (${userDetails.discord_name}):`,
                    sendError
                );
            }
        }
    } catch (error) {
        console.error("Error in notifyAcceptedUsers:", error);
    }
}