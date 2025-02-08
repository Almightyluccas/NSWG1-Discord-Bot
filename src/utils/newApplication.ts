import { Form1Submission } from "./request_perscom";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, TextChannel } from "discord.js";

export async function notifyNewApplications(
    newSubmissions: Form1Submission[],
    client: Client,
    channelID: string
) {
    try {
        const newSubmissionsChannel = client.channels.cache.get(channelID) as TextChannel;
        if (!newSubmissionsChannel) {
            console.error(`Channel with ID ${channelID} not found.`);
            return;
        }

        const applicationUrl = (formId: number) =>
            `https://nswg-1.com/admin/perscom/submissions/${formId}`; 

        const positionZeroSubmissions = newSubmissions.filter(
            (submission) => submission.preferred_position === "SO Special Warfare Operator"
        );
        const otherPositionSubmissions = newSubmissions.filter(
            (submission) => submission.preferred_position !== "SO Special Warfare Operator"
        );

        if (positionZeroSubmissions.length > 0) {
            const positionZeroMessage =
                positionZeroSubmissions.length === 1
                    ? `<@667833642248175673> <@492142030831616010> There is a new application. Please review it.`
                    : `<@667833642248175673> <@492142030831616010> There are ${positionZeroSubmissions.length} new applications. Please review them.`;

            const actionRow = new ActionRowBuilder<ButtonBuilder>();
            positionZeroSubmissions.forEach((submission) => {
                const reviewButton = new ButtonBuilder()
                    .setLabel(`View ${submission.discord_name}'s Application`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(applicationUrl(submission.form_id));
                actionRow.addComponents(reviewButton);
            });

            try {
                await newSubmissionsChannel.send({
                    content: positionZeroMessage,
                    components: [actionRow],
                });
            } catch (sendError) {
                console.error("Error sending SO Special Warfare Operator application notification:", sendError);
            }
        }

        if (otherPositionSubmissions.length > 0) {
            const otherPositionsMessage =
                otherPositionSubmissions.length === 1
                    ? `<@249242679211196417> There is a new application. Please review it.`
                    : `<@249242679211196417> There are ${otherPositionSubmissions.length} new applications. Please review them.`;

            const actionRow = new ActionRowBuilder<ButtonBuilder>();
            otherPositionSubmissions.forEach((submission) => {
                const reviewButton = new ButtonBuilder()
                    .setLabel(`View ${submission.discord_name}'s Application`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(applicationUrl(submission.form_id));
                actionRow.addComponents(reviewButton);
            });

            try {
                await newSubmissionsChannel.send({
                    content: otherPositionsMessage,
                    components: [actionRow],
                });
            } catch (sendError) {
                console.error("Error sending other positions application notification:", sendError);
            }
        }
    } catch (error) {
        console.error("Unexpected error in notifyNewApplications:", error);
    }
}