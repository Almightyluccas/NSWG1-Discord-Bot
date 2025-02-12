import { Client, Events, EmbedBuilder, TextChannel, Colors } from 'discord.js';
import { config } from '../config/config';
import { ServerStatusService, ServerData } from '../services/serverStatusService';

export async function serverStatusBot(client: Client): Promise<void> {
    const serverStatus = ServerStatusService.getInstance();
    let statusChannel: TextChannel | null = null;
    let lastMessageId: string | null = null;

    const createStatusEmbed = (data: ServerData): EmbedBuilder => {
        const embed = new EmbedBuilder()
            .setTitle('Server Status')
            .setColor(data.onlinePlayers > 0 ? Colors.Green : Colors.Red)
            .setTimestamp();

        if (data.onlinePlayers === 0) {
            embed.setDescription('😴 Server is currently empty');
        } else {
            embed.setDescription('🎮 Server is active!')
                .addFields(
                    { 
                        name: 'Players Online', 
                        value: `${data.onlinePlayers} player${data.onlinePlayers > 1 ? 's' : ''}`, 
                        inline: true 
                    },
                    { 
                        name: 'Player List', 
                        value: data.playerNames.map(name => `• ${name}`).join('\n') || 'No players', 
                        inline: false 
                    }
                );
        }

        return embed;
    };

    const updateStatusMessage = async (data: ServerData): Promise<void> => {
        if (!statusChannel) return;

        try {
            const embed = createStatusEmbed(data);

            if (lastMessageId) {
                try {
                    const message = await statusChannel.messages.fetch(lastMessageId);
                    await message.edit({ embeds: [embed] });
                    return;
                } catch (error) {
                    console.error('Failed to edit existing status message, will send new one');
                    lastMessageId = null;
                }
            }

            const message = await statusChannel.send({ embeds: [embed] });
            lastMessageId = message.id;
        } catch (error) {
            console.error('Error updating status message:', error);
        }
    };

    client.once(Events.ClientReady, async () => {
        console.log('Server Status Bot is ready');
        try {
            const channel = await client.channels.fetch(config.SERVER_STATUS_DISCORD_CHANNEL);
            if (!channel || !(channel instanceof TextChannel)) {
                throw new Error('Invalid server status channel');
            }
            statusChannel = channel;
            console.log('Server status channel initialized');

            // Initial status update
            const initialData = serverStatus.getCurrentData();
            await updateStatusMessage(initialData);
        } catch (error) {
            console.error('Error initializing server status channel:', error);
        }
    });

    // Listen for server status updates
    serverStatus.on('serverDataUpdated', async (data: ServerData) => {
        await updateStatusMessage(data);
    });
}