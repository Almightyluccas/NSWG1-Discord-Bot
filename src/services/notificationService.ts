import { Client, TextChannel, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Guild, Colors } from "discord.js";
import { AcceptedUsers, DeniedUsers, Form1Submission } from "./request_perscom";

const DISCORD_IDS = {
    SO_REVIEWER_1: '667833642248175673',
    SO_REVIEWER_2: '492142030831616010',
    OTHER_REVIEWER: '249242679211196417'
} as const;

const POSITIONS = {
    SO_OPERATOR: 'SO Special Warfare Operator'
} as const;

const AGE_REQUIREMENT = 16;
const REAPPLY_DAYS = 14;

type DiscordUser = {
    username: string;
    discord_id: string;
    nickname: string | null;
    displayName: string;
};

export class NotificationService {
    private client: Client;
    private mainChannelId: string;
    private newSubmissionsChannelId: string;

    constructor(client: Client, mainChannelId: string, newSubmissionsChannelId: string) {
        this.client = client;
        this.mainChannelId = mainChannelId;
        this.newSubmissionsChannelId = newSubmissionsChannelId;
    }

    private calculateAge(dateOfBirth: string): number {
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    private async getDiscordChannel(channelId: string): Promise<TextChannel | null> {
        const channel = this.client.channels.cache.get(channelId) as TextChannel;
        if (!channel) {
            console.error(`Channel with ID ${channelId} not found.`);
            return null;
        }
        return channel;
    }

    private async getGuildMembers(guild: Guild): Promise<DiscordUser[]> {
        try {
            const members = await guild.members.fetch();
            return members.map(member => ({
                username: member.user.username,
                discord_id: member.user.id,
                nickname: member.nickname,
                displayName: member.displayName
            }));
        } catch (error) {
            console.error('Error fetching guild members:', error);
            return [];
        }
    }

    private findDiscordUser(discordUsers: DiscordUser[], savedDiscordName: string, firstName?: string): DiscordUser | undefined {
        console.log('Searching for user:', { savedDiscordName, firstName });
        
        const cleanDiscordName = savedDiscordName.replace(/\s+/g, '');
        
        let user = discordUsers.find(user => 
            user.username.toLowerCase() === cleanDiscordName.toLowerCase()
        );

        if (!user && firstName) {
            const cleanFirstName = firstName.replace('.', '').trim();
            user = discordUsers.find(user => 
                user.displayName.toLowerCase() === cleanFirstName.toLowerCase() ||
                (user.nickname && user.nickname.toLowerCase() === cleanFirstName.toLowerCase())
            );
        }

        if (user) {
            console.log('Found user:', {
                originalDiscordName: savedDiscordName,
                cleanedDiscordName: cleanDiscordName,
                searchedFirstName: firstName,
                foundUser: {
                    username: user.username,
                    displayName: user.displayName,
                    nickname: user.nickname
                }
            });
        } else {
            console.log('No user found - will use discord_name without mention');
        }

        return user;
    }

    private createApplicationButton(discordName: string, formId: number): ButtonBuilder {
        return new ButtonBuilder()
            .setLabel(`View ${discordName}'s Application`)
            .setStyle(ButtonStyle.Link)
            .setURL(`https://nswg-1.com/admin/perscom/submissions/${formId}`);
    }

    private formatDateOfBirth(dateString: string): string {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    }

    private createNewApplicationEmbed(submission: Form1Submission, isSOPosition: boolean): EmbedBuilder {
        const formattedDOB = submission.date_of_birth ? this.formatDateOfBirth(submission.date_of_birth) : 'Not provided';
        
        return new EmbedBuilder()
            .setColor(Colors.Blue)
            .setTitle('New Application Received!')
            .setDescription(`${isSOPosition ? 
                `<@${DISCORD_IDS.SO_REVIEWER_1}> <@${DISCORD_IDS.SO_REVIEWER_2}>` : 
                `<@${DISCORD_IDS.OTHER_REVIEWER}>`} please review this application.`)
            .addFields(
                { name: 'Applicant Name', value: submission.first_name, inline: true },
                { name: 'Discord', value: submission.discord_name, inline: true },
                { name: 'Position', value: submission.preferred_position, inline: true },
                { name: 'Date of Birth', value: formattedDOB, inline: true }
            )
            .setTimestamp();
    }

    private createAcceptedEmbed(userDetails: any): EmbedBuilder {
        const mentionString = userDetails.preferred_position === POSITIONS.SO_OPERATOR
            ? `<@${DISCORD_IDS.SO_REVIEWER_1}> or <@${DISCORD_IDS.SO_REVIEWER_2}>`
            : `<@${DISCORD_IDS.OTHER_REVIEWER}>`;

        const userReference = userDetails.discord_id !== 'Not Found' 
            ? `<@${userDetails.discord_id}>`
            : userDetails.discord_name;

        return new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle('Application Accepted!')
            .setDescription(`Congratulations ${userReference}! Your application has been accepted.`)
            .addFields(
                { name: 'Next Steps', value: `Please get in touch with ${mentionString} on Discord for an interview.` },
                { name: 'Position', value: userDetails.preferred_position, inline: true }
            )
            .setTimestamp();
    }

    private createDeniedEmbed(userDetails: any, reason: string): EmbedBuilder {
        const userReference = userDetails.discord_id !== 'Not Found' 
            ? `<@${userDetails.discord_id}>`
            : userDetails.discord_name;

        return new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle('Application Status Update')
            .setDescription(`${userReference}, your application has been reviewed.`)
            .addFields(
                { name: 'Status', value: 'Denied', inline: true },
                { name: 'Reason', value: reason, inline: true }
            )
            .setTimestamp();
    }

    async notifyNewApplications(newSubmissions: Form1Submission[]) {
        try {
            const channel = await this.getDiscordChannel(this.newSubmissionsChannelId);
            if (!channel) return;

            const soSubmissions = newSubmissions.filter(s => s.preferred_position === POSITIONS.SO_OPERATOR);
            const otherSubmissions = newSubmissions.filter(s => s.preferred_position !== POSITIONS.SO_OPERATOR);

            for (const submission of soSubmissions) {
                const embed = this.createNewApplicationEmbed(submission, true);
                const button = this.createApplicationButton(submission.discord_name, submission.form_id);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
                const mentionContent = `<@${DISCORD_IDS.SO_REVIEWER_1}> <@${DISCORD_IDS.SO_REVIEWER_2}>`;
                
                await channel.send({ 
                    content: mentionContent,
                    embeds: [embed], 
                    components: [row] 
                });
            }

            for (const submission of otherSubmissions) {
                const embed = this.createNewApplicationEmbed(submission, false);
                const button = this.createApplicationButton(submission.discord_name, submission.form_id);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
                const mentionContent = `<@${DISCORD_IDS.OTHER_REVIEWER}>`;
                
                await channel.send({ 
                    content: mentionContent,
                    embeds: [embed], 
                    components: [row] 
                });
            }
        } catch (error) {
            console.error("Error in notifyNewApplications:", error);
        }
    }

    async notifyAcceptedUsers(newAcceptedUsers: AcceptedUsers[], data: Form1Submission[]) {
        try {
            const channel = await this.getDiscordChannel(this.mainChannelId);
            if (!channel) return;
    
            const form1DataMap = new Map(data.map(submission => [submission.user_id, submission.discord_name]));
    
            const newAcceptedUserDetails = newAcceptedUsers.map(user => ({
                ...user,
                discord_name: form1DataMap.get(user.user_id) || 'Not Found',
            }));
    
            const guild = this.client.guilds.cache.get(channel.guild.id);
            if (!guild) {
                console.error('Guild not found.');
                return;
            }
    
            const discordUsers = await this.getGuildMembers(guild);
    
            const newAcceptedUserDetailsWithDiscordId = newAcceptedUserDetails.map(user => {
                const formData = data.find(d => d.user_id === user.user_id);
                const discordUser = this.findDiscordUser(discordUsers, user.discord_name, formData?.first_name);
                return {
                    ...user,
                    discord_id: discordUser ? discordUser.discord_id : 'Not Found',
                };
            });
    
            for (const userDetails of newAcceptedUserDetailsWithDiscordId) {
                const embed = this.createAcceptedEmbed(userDetails);
                const mentionInContent = userDetails.discord_id !== 'Not Found' ? `<@${userDetails.discord_id}>` : '';
                await channel.send({ 
                    content: mentionInContent,
                    embeds: [embed] 
                });
            }
        } catch (error) {
            console.error("Error in notifyAcceptedUsers:", error);
        }
    }

    async notifyDeniedUsers(newDeniedUsers: DeniedUsers[], data: Form1Submission[]) {
        try {
            const channel = await this.getDiscordChannel(this.mainChannelId);
            if (!channel) return;
    
            const form1DataMap = new Map(data.map(submission => [submission.user_id, submission.discord_name]));
            const deniedUserDetails = newDeniedUsers.map(user => ({
                ...user,
                discord_name: form1DataMap.get(user.user_id) || 'Not Found',
            }));
    
            const guild = this.client.guilds.cache.get(channel.guild.id);
            if (!guild) {
                console.error("Guild not found.");
                return;
            }
    
            const discordUsers = await this.getGuildMembers(guild);
    
            const deniedUserDetailsWithDiscordId = deniedUserDetails.map(user => {
                const formData = data.find(d => d.user_id === user.user_id);
                const discordUser = this.findDiscordUser(discordUsers, user.discord_name, formData?.first_name);
                return {
                    ...user,
                    discord_id: discordUser ? discordUser.discord_id : 'Not Found',
                };
            });
    
            for (const userDetails of deniedUserDetailsWithDiscordId) {
                if (userDetails.discord_id !== 'Not Found' && userDetails.date_of_birth) {
                    const reason = this.calculateAge(userDetails.date_of_birth) < AGE_REQUIREMENT
                        ? `Age requirement not met. Minimum age requirement is ${AGE_REQUIREMENT}+.`
                        : `Application denied due to lack of effort. You may reapply in ${REAPPLY_DAYS} days.`;

                    const embed = this.createDeniedEmbed(userDetails, reason);
                    const mentionInContent = `<@${userDetails.discord_id}>`;
                    await channel.send({ 
                        content: mentionInContent,
                        embeds: [embed] 
                    });
                }
            }
        } catch (error) {
            console.error("Error in notifyDeniedUsers:", error);
        }
    }
}
