import { Client, GatewayIntentBits } from 'discord.js';
import { NotificationService } from '../services/notificationService';
import { Form1Submission, AcceptedUsers } from '../services/request_perscom';
import { config } from '../config/config';

const mockFormData: Form1Submission[] = [
    {
        first_name: "G. Luccas",
        discord_name: ".luccas",
        preferred_position: "SO Special Warfare Operator",
        user_id: 999,
        form_id: 999,
        date_of_birth: "2000-01-01"
    }
];

const mockAcceptedUsers: AcceptedUsers[] = [
    {
        discord_name: "DFSSDFS",
        first_name: "G. Luccas",
        user_id: 999,
        preferred_position: "SO Special Warfare Operator",
        form_id: 999,
        date_of_birth: "2000-01-01"
    }
];

describe('NotificationService Integration Tests', () => {
    let client: Client;
    let notificationService: NotificationService;

    beforeAll(async () => {
        console.log('Setting up test environment...');
        
        client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
            ],
        });

        try {
            await client.login(config.DISCORD_TOKEN);
            
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Client ready timeout'));
                }, 10000);

                client.once('ready', () => {
                    console.log('Discord client ready for testing');
                    clearTimeout(timeout);
                    resolve();
                });
            });

            notificationService = new NotificationService(
                client,
                config.APPLICATION_DISCORD_CHANNEL_ID,
                config.NEW_APPLICATION_CHANNEL_ID
            );
        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    }, 30000);

    afterAll(async () => {
        if (client) {
            await client.destroy();
        }
    });

    test('should send notifications for accepted applications', async () => {
        console.log('Starting accepted applications test...');
        expect.assertions(1);

        try {
            console.log('Mock data:', { mockAcceptedUsers, mockFormData });
            await notificationService.notifyAcceptedUsers(mockAcceptedUsers, mockFormData);
            console.log('Accepted notifications sent successfully');
            expect(true).toBe(true);
        } catch (error) {
            console.error('Error in accepted notifications test:', error);
            expect(error).toBeUndefined();
        }
    }, 20000);
});