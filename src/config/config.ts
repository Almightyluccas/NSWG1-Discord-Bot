import dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
    const result = dotenv.config({
        path: path.resolve(__dirname, '../../.env')
    });

    if (result.error) {
        console.warn('Warning: .env file not found, will use environment variables');
    }
}

interface Config {
    DISCORD_TOKEN: string;
    APPLICATION_DISCORD_CHANNEL_ID: string;
    NEW_APPLICATION_CHANNEL_ID: string;
    APPLICATION_DB_USERNAME: string;
    APPLICATION_DB_PASSWORD: string;
    APPLICATION_DB_HOST: string;
    APPLICATION_DB_PORT: number;
    APPLICATION_DB_NAME: string;
    ATTENDANCE_DB_USERNAME: string;
    ATTENDANCE_DB_PASSWORD: string;
    ATTENDANCE_DB_HOST: string;
    ATTENDANCE_DB_PORT: number;
    ATTENDANCE_DB_NAME: string;
    BEARER_TOKEN_PERSCOM: string;
}

function validateConfig(): Config {
    const requiredEnvVars = [
        'DISCORD_TOKEN',
        'APPLICATION_DISCORD_CHANNEL_ID',
        'NEW_APPLICATION_CHANNEL_ID',
        'APPLICATION_DB_USERNAME',
        'APPLICATION_DB_PASSWORD',
        'APPLICATION_DB_HOST',
        'APPLICATION_DB_NAME',
        'ATTENDANCE_DB_USERNAME',
        'ATTENDANCE_DB_PASSWORD',
        'ATTENDANCE_DB_HOST',
        'ATTENDANCE_DB_NAME',
        'BEARER_TOKEN_PERSCOM'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return {
        DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
        APPLICATION_DISCORD_CHANNEL_ID: process.env.APPLICATION_DISCORD_CHANNEL_ID!,
        NEW_APPLICATION_CHANNEL_ID: process.env.NEW_APPLICATION_CHANNEL_ID!,
        APPLICATION_DB_USERNAME: process.env.APPLICATION_DB_USERNAME!,
        APPLICATION_DB_PASSWORD: process.env.APPLICATION_DB_PASSWORD!,
        APPLICATION_DB_HOST: process.env.APPLICATION_DB_HOST!,
        APPLICATION_DB_PORT: parseInt(process.env.APPLICATION_DB_PORT || "3306", 10),
        APPLICATION_DB_NAME: process.env.APPLICATION_DB_NAME!,
        ATTENDANCE_DB_USERNAME: process.env.ATTENDANCE_DB_USERNAME!,
        ATTENDANCE_DB_PASSWORD: process.env.ATTENDANCE_DB_PASSWORD!,
        ATTENDANCE_DB_HOST: process.env.ATTENDANCE_DB_HOST!,
        ATTENDANCE_DB_PORT: parseInt(process.env.ATTENDANCE_DB_PORT || "3306", 10),
        ATTENDANCE_DB_NAME: process.env.ATTENDANCE_DB_NAME!,
        BEARER_TOKEN_PERSCOM: process.env.BEARER_TOKEN_PERSCOM!
    };
}

export const config = validateConfig();
