import { Form1Submission } from "./request_perscom";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, TextChannel } from "discord.js";

export async function notifyNewApplications(newSubmissions: Form1Submission[], client: Client, channelID: string) {
    const newSubmissionsChannel = client.channels.cache.get(channelID!) as TextChannel;

    if (!newSubmissionsChannel) {
        console.error(`Channel with ID ${channelID} not found.`);
        return;
    }

    const positionZeroSubmissions = newSubmissions.filter(submission => submission.preferred_position === 0);
    const otherPositionSubmissions = newSubmissions.filter(submission => submission.preferred_position !== 0);

    const applicationUrl = (formId: number) => `https://nswg-1.com/admin/perscom/submissions/${formId}`; // Replace with actual URL for single application

    if (positionZeroSubmissions.length > 0) {
        const positionZeroMessage =
            positionZeroSubmissions.length === 1
                ? `<@667833642248175673> <@492142030831616010> There is a new application. Please review it.`
                : `<@667833642248175673> <@492142030831616010> There are ${positionZeroSubmissions.length} new applications. Please review them.`;

        const actionRow = new ActionRowBuilder<ButtonBuilder>();
        positionZeroSubmissions.forEach(submission => {
            const reviewButton = new ButtonBuilder()
                .setLabel(`View ${submission.discord_name}'s Application`)
                .setStyle(ButtonStyle.Link)
                .setURL(applicationUrl(submission.form_id));
            actionRow.addComponents(reviewButton);
        });

        await newSubmissionsChannel.send({
            content: positionZeroMessage,
            components: [actionRow],
        });
    }

    if (otherPositionSubmissions.length > 0) {
        const otherPositionsMessage =
            otherPositionSubmissions.length === 1
                ? `<@249242679211196417> There is a new application. Please review it.`
                : `<@249242679211196417> There are ${otherPositionSubmissions.length} new applications. Please review them.`;

        const actionRow = new ActionRowBuilder<ButtonBuilder>();
        otherPositionSubmissions.forEach(submission => {
            const reviewButton = new ButtonBuilder()
                .setLabel(`View ${submission.discord_name}'s Application`)
                .setStyle(ButtonStyle.Link)
                .setURL(applicationUrl(submission.form_id));
            actionRow.addComponents(reviewButton);
        });

        await newSubmissionsChannel.send({
            content: otherPositionsMessage,
            components: [actionRow],
        });
    }
}