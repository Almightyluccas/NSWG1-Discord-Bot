import {AcceptedUsers, Form1Submission} from "./request_perscom";
import {Client, TextChannel} from "discord.js";

export async function notifyAcceptedUsers(newAcceptedUsers: AcceptedUsers[], data: Form1Submission[], client: Client, channelID: string) {
    const channel = client.channels.cache.get(channelID!) as TextChannel;

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
    const discordMembers = await guild.members.fetch();
    const discordUsers = discordMembers.map(member => ({
        username: member.user.username,
        discord_id: member.user.id,
    }));

    const newAcceptedUserDetailsWithDiscordId = newAcceptedUserDetails.map(user => {
        const savedDiscordName = user.discord_name.split(' ')[0];
        const discordUser = discordUsers.find(dUser => dUser.username === savedDiscordName);

        return {
            ...user,
            discord_id: discordUser ? discordUser.discord_id : 'Not Found',
        };
    });


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
}