import { DeniedUsers, Form1Submission} from "./request_perscom";
import {Client, TextChannel} from "discord.js";


function calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export async function notifyDeniedUsers(newDeniedUsers: DeniedUsers[], data: Form1Submission[], client: Client, channelID: string) {
    const channel = client.channels.cache.get(channelID!) as TextChannel;

    if (!channel) {
        console.error(`Channel with ID ${channelID} not found.`);
        return;
    }

    const form1DataMap = new Map(data.map(submission => [submission.user_id, submission.discord_name]));

    const deniedUserDetails = newDeniedUsers.map(user => ({
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
        nickname: member.nickname,
        displayName: member.displayName
    }));

    const deniedUserDetailsWithDiscordId = deniedUserDetails.map(user => {
        const savedDiscordName = user.discord_name.split(' ')[0];
        let discordUser = discordUsers.find(dUser => dUser.username === savedDiscordName);
        if (!discordUser) {
            discordUser = discordUsers.find(dUser => dUser.nickname === savedDiscordName);
        }
        if(!discordUser) {
            discordUser = discordUsers.find(dUser => dUser.displayName === savedDiscordName);
        }

        return {
            ...user,
            discord_id: discordUser ? discordUser.discord_id : 'Not Found',
        };
    });


    for (const userDetails of deniedUserDetailsWithDiscordId) {
        if (userDetails.discord_id !== 'Not Found' && userDetails.date_of_birth) {
            if (calculateAge(userDetails.date_of_birth) < 16) {
                await channel.send(
                    `<@${userDetails.discord_id}> Your application has been denied due to age requirement. Must be 16+ `
                );
            } else {
                await channel.send(
                    `<@${userDetails.discord_id}> Your application has been denied due to lack of effort. Please try again in 14 days`
                );
            }
        }
    }
}