import { Client, Collection, Events, REST, Routes } from 'discord.js';
import { config } from "../config/config";
import { Command } from '../interfaces/Command';
import { messageCommand } from '../commands/message';
import { attendanceCommand } from '../commands/attendance';

const commands = [messageCommand, attendanceCommand];

interface BotClient extends Client {
    commands: Collection<string, Command>;
}

export async function commandBot(client: Client): Promise<void> {
    const botClient = client as BotClient;
    botClient.commands = new Collection<string, Command>();

    for (const command of commands) {
        botClient.commands.set(command.data.name, command);
    }

    client.once(Events.ClientReady, async () => {
        console.log(`Command Bot has logged in as ${client.user?.tag}`);

        try {
            const rest = new REST().setToken(config.DISCORD_TOKEN);
            const commandData = commands.map(command => command.data.toJSON());

            console.log('Started refreshing application (/) commands.');
            await rest.put(
                Routes.applicationCommands(client.user?.id || ''),
                { body: commandData },
            );
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error('Error registering slash commands:', error);
        }
    });

    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const command = botClient.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);
            const errorMessage = 'There was an error executing this command!';

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    });
}