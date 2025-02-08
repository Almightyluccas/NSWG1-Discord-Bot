"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyDeniedUsers = notifyDeniedUsers;
function calculateAge(dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
function notifyDeniedUsers(newDeniedUsers, data, client, channelID) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channel = client.channels.cache.get(channelID);
            if (!channel) {
                console.error(`Channel with ID ${channelID} not found.`);
                return;
            }
            const form1DataMap = new Map(data.map(submission => [submission.user_id, submission.discord_name]));
            const deniedUserDetails = newDeniedUsers.map(user => (Object.assign(Object.assign({}, user), { discord_name: form1DataMap.get(user.id) || 'Not Found' })));
            const guild = client.guilds.cache.get(channel.guild.id);
            if (!guild) {
                console.error("Guild not found.");
                return;
            }
            let discordMembers;
            try {
                discordMembers = yield guild.members.fetch();
            }
            catch (fetchError) {
                console.error("Error fetching guild members:", fetchError);
                return;
            }
            const discordUsers = discordMembers.map(member => ({
                username: member.user.username,
                discord_id: member.user.id,
                nickname: member.nickname,
                displayName: member.displayName
            }));
            const deniedUserDetailsWithDiscordId = deniedUserDetails.map(user => {
                const savedDiscordName = user.discord_name.split(' ')[0];
                let discordUser = discordUsers.find(dUser => dUser.username === savedDiscordName)
                    || discordUsers.find(dUser => dUser.nickname === savedDiscordName)
                    || discordUsers.find(dUser => dUser.displayName === savedDiscordName);
                return Object.assign(Object.assign({}, user), { discord_id: discordUser ? discordUser.discord_id : 'Not Found' });
            });
            for (const userDetails of deniedUserDetailsWithDiscordId) {
                try {
                    if (userDetails.discord_id !== 'Not Found' && userDetails.date_of_birth) {
                        if (calculateAge(userDetails.date_of_birth) < 16) {
                            yield channel.send(`<@${userDetails.discord_id}> Your application has been denied due to age requirement. The age requirement is 16+.`);
                        }
                        else {
                            yield channel.send(`<@${userDetails.discord_id}> Your application has been denied due to lack of effort. Please try again in 14 days.`);
                        }
                    }
                    else {
                        console.warn(`Skipping notification for user ${userDetails.name} (Discord ID not found or missing date_of_birth).`);
                    }
                }
                catch (sendError) {
                    console.error(`Error sending notification to user ${userDetails.discord_id}:`, sendError);
                }
            }
        }
        catch (error) {
            console.error("Unhandled error in notifyDeniedUsers:", error);
        }
    });
}
