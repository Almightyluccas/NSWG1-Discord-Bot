import { Client, Events, EmbedBuilder, TextChannel, Colors } from 'discord.js';
import { config } from '../config/config';
import { ServerStatusService, ServerData } from '../services/serverStatusService';

export async function serverStatusBot(client: Client): Promise<void> {
    const serverStatus = ServerStatusService.getInstance();
    let statusChannel: TextChannel | null = null;
    let lastData: ServerData = {
        onlinePlayers: 0,
        playerNames: []
    };

    const createStatusEmbed = (data: ServerData): EmbedBuilder => {
        const embed = new EmbedBuilder()
            .setTitle('Server Status')
            .setColor(data.onlinePlayers > 0 ? Colors.Green : Colors.Red)
            .setTimestamp();

        if (data.onlinePlayers === 0 && data.playerNames.length === 0) {
            embed.setDescription('Server is currently empty');
        } else {
            embed.setDescription('Server is active!')
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
        if (!statusChannel || !client.user) return;

        try {
            const hasChanged = 
                lastData.onlinePlayers !== data.onlinePlayers ||
                lastData.playerNames.length !== data.playerNames.length ||
                JSON.stringify(lastData.playerNames) !== JSON.stringify(data.playerNames);

            if (!hasChanged) {
                return;
            }

            lastData = {
                onlinePlayers: data.onlinePlayers,
                playerNames: [...data.playerNames]
            };

            console.log('Updating status with data:', {
                onlinePlayers: data.onlinePlayers,
                playerNames: data.playerNames,
                timestamp: new Date().toISOString()
            });

            const messages = await statusChannel.messages.fetch({ limit: 10 });
            const lastBotMessage = messages.find(msg => msg.author.id === client.user?.id);
            
            if (lastBotMessage) {
                try {
                    await lastBotMessage.delete();
                } catch (error) {
                    console.error('Failed to delete old status message:', error);
                }
            }

            const embed = createStatusEmbed(data);
            await statusChannel.send({ embeds: [embed] });
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

            const initialData = serverStatus.getCurrentData();
            console.log('Initial server data:', initialData);
            await updateStatusMessage(initialData);
        } catch (error) {
            console.error('Error initializing server status channel:', error);
        }
    });

    serverStatus.on('serverDataUpdated', async (data: ServerData) => {
        console.log('Received server data update:', {
            onlinePlayers: data.onlinePlayers,
            playerNames: data.playerNames,
            timestamp: new Date().toISOString()
        });
        await updateStatusMessage(data);
    });
}