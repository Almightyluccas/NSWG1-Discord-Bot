import { ChannelType, ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, SlashCommandBuilder, TextChannel, StringSelectMenuBuilder, ComponentType, StringSelectMenuInteraction, GuildMember, ButtonBuilder, ButtonStyle, ButtonInteraction, EmbedBuilder, Interaction } from "discord.js";
import { Command } from "../interfaces/Command";

const ALLOWED_ROLES = {
    ADMIN: '1338753333518667817',
} as const;

export const messageCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('nswg-message')
        .setDescription('Send a custom message to a channel')
        .setDefaultMemberPermissions('0'),

    async execute(interaction: ChatInputCommandInteraction) {
        const member = interaction.member as GuildMember;
        const hasPermission = Object.values(ALLOWED_ROLES).some(roleId => 
            member.roles.cache.has(roleId)
        );

        if (!hasPermission) {
            await interaction.reply({
                content: 'You do not have permission to use this command.',
            });
            return;
        }

        try {
            const channels = interaction.guild?.channels.cache
                .filter(channel => channel.type === ChannelType.GuildText)
                .map(channel => ({
                    label: channel.name,
                    value: channel.id
                }));

            if (!channels || channels.length === 0) {
                await interaction.reply({
                    content: 'No text channels found.',
                });
                return;
            }

            const select = new StringSelectMenuBuilder()
                .setCustomId('channel-select')
                .setPlaceholder('Select a channel')
                .addOptions(channels);

            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(select);

            const response = await interaction.reply({
                content: 'Select a channel to send the message to:',
                components: [row],
            });

            const channelSelection = await response.awaitMessageComponent({
                filter: i => i.customId === 'channel-select' && i.componentType === ComponentType.StringSelect,
                time: 60000
            }).catch(() => null) as StringSelectMenuInteraction | null;

            if (!channelSelection) {
                await interaction.editReply({
                    content: 'Channel selection timed out.',
                    components: []
                });
                return;
            }

            const selectedChannelId = channelSelection.values[0];

            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('regular-message')
                        .setLabel('Regular Message')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('embed-message')
                        .setLabel('Embed Message')
                        .setStyle(ButtonStyle.Secondary)
                );

            await channelSelection.update({
                content: 'Choose message type:',
                components: [buttons]
            });

            const collector = response.createMessageComponentCollector({
                filter: (i: Interaction) => i.user.id === interaction.user.id,
                time: 60000
            });

            const buttonInteraction = await new Promise<ButtonInteraction | null>((resolve) => {
                collector.on('collect', async (i: ButtonInteraction) => {
                    if (['regular-message', 'embed-message'].includes(i.customId)) {
                        resolve(i);
                        collector.stop();
                    }
                });

                collector.on('end', () => {
                    resolve(null);
                });
            });

            if (!buttonInteraction) {
                await interaction.editReply({
                    content: 'Message type selection timed out.',
                    components: []
                });
                return;
            }

            const isEmbed = buttonInteraction.customId === 'embed-message';
            if (isEmbed) {
                const modal = new ModalBuilder()
                    .setCustomId(`message-modal-${selectedChannelId}-embed`)
                    .setTitle('Create Embed Message');

                const titleInput = new TextInputBuilder()
                    .setCustomId('embed-title')
                    .setLabel('Embed Title')
                    .setPlaceholder('Supports markdown: **bold** or *italic*')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(256);

                const descriptionInput = new TextInputBuilder()
                    .setCustomId('embed-description')
                    .setLabel('Main Description')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setPlaceholder('Main body of the embed (optional)')
                    .setMaxLength(2000);

                const fieldsInput = new TextInputBuilder()
                    .setCustomId('embed-fields')
                    .setLabel('Fields (Name|Value|Row|Inline) - Max 25 fields')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setPlaceholder('Format: Name|Value|Row|Inline\n\nExample:\nTitle|Content|1|true')
                    .setMaxLength(2000);

                const colorInput = new TextInputBuilder()
                    .setCustomId('embed-color')
                    .setLabel('Color (hex code)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder('#2f3136');

                const components = [
                    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(fieldsInput),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
                ];

                modal.addComponents(components);
                await buttonInteraction.showModal(modal);

                const modalSubmit = await interaction.awaitModalSubmit({
                    filter: i => i.customId === `message-modal-${selectedChannelId}-embed`,
                    time: 600000
                }).catch(() => null);

                if (!modalSubmit) {
                    await interaction.editReply({
                        content: 'Message creation timed out.',
                        components: []
                    });
                    return;
                }

                const title = modalSubmit.fields.getTextInputValue('embed-title');
                const description = modalSubmit.fields.getTextInputValue('embed-description');
                const fieldsText = modalSubmit.fields.getTextInputValue('embed-fields');
                const color = modalSubmit.fields.getTextInputValue('embed-color') || '#2f3136';

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setColor(color as `#${string}`);

                if (description) {
                    embed.setDescription(description);
                }

                if (fieldsText) {
                    const fieldsByRow = new Map<number, Array<{ name: string, value: string, inline: boolean }>>();

                    fieldsText.split('\n')
                        .filter(line => line.trim())
                        .forEach(line => {

                            const [name = '', valueWithFormat = '', rowStr = '1', inline = 'false'] = line.split('|', 4);
                            
                            const row = parseInt(rowStr.trim()) || 1;
                            const value = valueWithFormat
                                .trim()
                                .replace(/\\n/g, '\n');
                            
                            if (!fieldsByRow.has(row)) {
                                fieldsByRow.set(row, []);
                            }
                            
                            fieldsByRow.get(row)?.push({
                                name: name.trim() || '\u200B',
                                value: value || '\u200B',
                                inline: inline.trim().toLowerCase() === 'true'
                            });
                        });

                    Array.from(fieldsByRow.entries())
                        .sort(([a], [b]) => a - b)
                        .forEach(([_, fields]) => {
                            fields.forEach(field => {
                                embed.addFields(field);
                            });
                        });
                }

                embed.setTimestamp();

                const channel = interaction.guild?.channels.cache.get(selectedChannelId) as TextChannel;
                await channel.send({ embeds: [embed] });

                await modalSubmit.reply({
                    content: `Embed Message sent to ${channel}`,
                });

                await channelSelection.message.edit({
                    content: `Embed Message sent to ${channel}`,
                    components: [] 
                });

            } else {
                const modal = new ModalBuilder()
                    .setCustomId(`message-modal-${selectedChannelId}-regular`)
                    .setTitle('Send Custom Message');

                const messageInput = new TextInputBuilder()
                    .setCustomId('message-content')
                    .setLabel('Message Content')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(2000)
                    .setPlaceholder('Enter your message here (supports markdown)');

                const messageRow = new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(messageInput);

                modal.addComponents([messageRow]);
                await buttonInteraction.showModal(modal);

                const modalSubmit = await interaction.awaitModalSubmit({
                    filter: i => i.customId === `message-modal-${selectedChannelId}-regular`,
                    time: 600000
                }).catch(() => null);

                if (!modalSubmit) {
                    await interaction.editReply({
                        content: 'Message creation timed out.',
                        components: []
                    });
                    return;
                }

                const content = modalSubmit.fields.getTextInputValue('message-content');
                const channel = interaction.guild?.channels.cache.get(selectedChannelId) as TextChannel;

                if (content.length > 2000) {
                    const sections = content.match(/(.|\n){1,4096}/g) || [];
                    const embeds = sections.map((section, index) => {
                        return new EmbedBuilder()
                            .setDescription(section)
                            .setColor('#2f3136')
                            .setFooter(index === sections.length - 1 ? null : { text: 'Continued...' });
                    });

                    for (let i = 0; i < embeds.length; i += 10) {
                        const embedChunk = embeds.slice(i, i + 10);
                        await channel.send({ embeds: embedChunk });
                    }
                } else {
                    await channel.send({
                        content,
                        allowedMentions: { parse: [] }
                    });
                }

                await modalSubmit.reply({
                    content: `Message sent to ${channel}`,
                });

                await channelSelection.message.edit({
                    content: `Message sent to ${channel}`,
                    components: [] 
                });
            }

        } catch (error) {
            console.error('Error executing message command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error executing this command.',
                });
            } else {
                await interaction.followUp({
                    content: 'There was an error executing this command.',
                });
            }
        }
    }
};
