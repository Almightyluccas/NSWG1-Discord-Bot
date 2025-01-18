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
exports.notifyAcceptedUsers = notifyAcceptedUsers;
function notifyAcceptedUsers(newAcceptedUsers, data, client, channelID) {
    return __awaiter(this, void 0, void 0, function* () {
        const channel = client.channels.cache.get(channelID);
        if (!channel) {
            console.error(`Channel with ID ${channelID} not found.`);
            return;
        }
        const form1DataMap = new Map(data.map(submission => [submission.user_id, submission.discord_name]));
        const newAcceptedUserDetails = newAcceptedUsers.map(user => (Object.assign(Object.assign({}, user), { discord_name: form1DataMap.get(user.id) || 'Not Found' })));
        const guild = client.guilds.cache.get(channel.guild.id);
        if (!guild) {
            console.error('Guild not found.');
            return;
        }
        const discordMembers = yield guild.members.fetch();
        const discordUsers = discordMembers.map(member => ({
            username: member.user.username,
            discord_id: member.user.id,
        }));
        const newAcceptedUserDetailsWithDiscordId = newAcceptedUserDetails.map(user => {
            const discordUser = discordUsers.find(dUser => dUser.username === user.discord_name);
            return Object.assign(Object.assign({}, user), { discord_id: discordUser ? discordUser.discord_id : 'Not Found' });
        });
        for (const userDetails of newAcceptedUserDetailsWithDiscordId) {
            if (userDetails.discord_id !== 'Not Found') {
                if (userDetails.preferred_position === 0) {
                    yield channel.send(`<@${userDetails.discord_id}> Your application has been accepted please get in touch with <@667833642248175673> or <@492142030831616010> on Discord for an interview.`);
                }
                else {
                    yield channel.send(`<@${userDetails.discord_id}> Your application has been accepted please get in touch with <@249242679211196417> on Discord for an interview.`);
                }
            }
            else {
                yield channel.send(`${userDetails.name}/${userDetails.discord_name} (User not found in Discord) has been accepted.`);
            }
        }
    });
}
