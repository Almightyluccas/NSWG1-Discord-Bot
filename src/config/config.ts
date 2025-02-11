import dotenv from 'dotenv';
import path from 'path';

const result = dotenv.config({
    path: path.resolve(__dirname, '../../.env')
});

if (result.error) {
    throw new Error('Error loading .env file');
}

interface Config {
    DISCORD_TOKEN: string;
    DISCORD_CHANNEL_ID: string;
    NEW_SUBMISSIONS_CHANNEL_ID: string;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    BEARER_TOKEN_PERSCOM: string;
}

function validateConfig(): Config {
    const requiredEnvVars = [
        'DISCORD_TOKEN',
        'DISCORD_CHANNEL_ID',
        'NEW_SUBMISSIONS_CHANNEL_ID',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DB_HOST',
        'DB_NAME',
        'BEARER_TOKEN_PERSCOM'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return {
        DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
        DISCORD_CHANNEL_ID: process.env.DISCORD_CHANNEL_ID!,
        NEW_SUBMISSIONS_CHANNEL_ID: process.env.NEW_SUBMISSIONS_CHANNEL_ID!,
        DB_USERNAME: process.env.DB_USERNAME!,
        DB_PASSWORD: process.env.DB_PASSWORD!,
        DB_HOST: process.env.DB_HOST!,
        DB_PORT: parseInt(process.env.DB_PORT || "3306", 10),
        DB_NAME: process.env.DB_NAME!,
        BEARER_TOKEN_PERSCOM: process.env.BEARER_TOKEN_PERSCOM!
    };
}

export const config = validateConfig();
