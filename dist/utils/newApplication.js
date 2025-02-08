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
exports.notifyNewApplications = notifyNewApplications;
const discord_js_1 = require("discord.js");
function notifyNewApplications(newSubmissions, client, channelID) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const newSubmissionsChannel = client.channels.cache.get(channelID);
            if (!newSubmissionsChannel) {
                console.error(`Channel with ID ${channelID} not found.`);
                return;
            }
            const applicationUrl = (formId) => `https://nswg-1.com/admin/perscom/submissions/${formId}`;
            const positionZeroSubmissions = newSubmissions.filter((submission) => submission.preferred_position === "SO Special Warfare Operator");
            const otherPositionSubmissions = newSubmissions.filter((submission) => submission.preferred_position !== "SO Special Warfare Operator");
            if (positionZeroSubmissions.length > 0) {
                const positionZeroMessage = positionZeroSubmissions.length === 1
                    ? `<@667833642248175673> <@492142030831616010> There is a new application. Please review it.`
                    : `<@667833642248175673> <@492142030831616010> There are ${positionZeroSubmissions.length} new applications. Please review them.`;
                const actionRow = new discord_js_1.ActionRowBuilder();
                positionZeroSubmissions.forEach((submission) => {
                    const reviewButton = new discord_js_1.ButtonBuilder()
                        .setLabel(`View ${submission.discord_name}'s Application`)
                        .setStyle(discord_js_1.ButtonStyle.Link)
                        .setURL(applicationUrl(submission.form_id));
                    actionRow.addComponents(reviewButton);
                });
                try {
                    yield newSubmissionsChannel.send({
                        content: positionZeroMessage,
                        components: [actionRow],
                    });
                }
                catch (sendError) {
                    console.error("Error sending SO Special Warfare Operator application notification:", sendError);
                }
            }
            if (otherPositionSubmissions.length > 0) {
                const otherPositionsMessage = otherPositionSubmissions.length === 1
                    ? `<@249242679211196417> There is a new application. Please review it.`
                    : `<@249242679211196417> There are ${otherPositionSubmissions.length} new applications. Please review them.`;
                const actionRow = new discord_js_1.ActionRowBuilder();
                otherPositionSubmissions.forEach((submission) => {
                    const reviewButton = new discord_js_1.ButtonBuilder()
                        .setLabel(`View ${submission.discord_name}'s Application`)
                        .setStyle(discord_js_1.ButtonStyle.Link)
                        .setURL(applicationUrl(submission.form_id));
                    actionRow.addComponents(reviewButton);
                });
                try {
                    yield newSubmissionsChannel.send({
                        content: otherPositionsMessage,
                        components: [actionRow],
                    });
                }
                catch (sendError) {
                    console.error("Error sending other positions application notification:", sendError);
                }
            }
        }
        catch (error) {
            console.error("Unexpected error in notifyNewApplications:", error);
        }
    });
}
