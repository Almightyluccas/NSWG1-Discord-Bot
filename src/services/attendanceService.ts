import mysql from 'mysql2/promise';
import { config } from '../config/config';

let connection: mysql.Connection | null = null;
let connectionTimeout: NodeJS.Timeout | null = null;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

async function getConnection(): Promise<mysql.Connection> {
    if (!connection) {
        connection = await mysql.createConnection({
            host: config.ATTENDANCE_DB_HOST,
            user: config.ATTENDANCE_DB_USERNAME,
            password: config.ATTENDANCE_DB_PASSWORD,
            database: config.ATTENDANCE_DB_NAME,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });

        connection.on('error', async (err) => {
            console.error('Database connection error:', err);
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.log('Reconnecting to database...');
                connection = null;
                await getConnection();
            }
        });
    }

    // Reset the timeout whenever the connection is used
    if (connectionTimeout) {
        clearTimeout(connectionTimeout);
    }
    
    connectionTimeout = setTimeout(async () => {
        await cleanup();
    }, IDLE_TIMEOUT);

    return connection;
}

export const TRACKING_START_DATE = new Date(Date.UTC(2025, 1, 8));

export interface AttendanceRecord {
    date: Date;
    minutes: number;
    raid_type: string;
    status?: string;
}

export async function getPlayerAttendance(playerNickname: string): Promise<AttendanceRecord[]> {
    try {
        const conn = await getConnection();
        
        const [rows] = await conn.query<mysql.RowDataPacket[]>(
            'SELECT date, player, minutes, raid_type, status FROM RaidActivity WHERE player = ?',
            [playerNickname]
        );

        return rows.map(row => {
            const timestamp = typeof row.date === 'string' ? parseInt(row.date) : Number(row.date);
            const date = new Date(timestamp);
            
            return {
                date,
                minutes: Number(row.minutes),
                raid_type: row.raid_type,
                status: row.status
            };
        });
    } catch (error) {
        console.error('Error fetching player attendance:', error);
    
        throw error;
    }
}

export async function cleanup(): Promise<void> {
    try {
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
        }
        
        if (connection) {
            await connection.end();
            connection = null;
            console.log('Database connection closed due to inactivity');
        }
    } catch (error) {
        console.error('Error closing database connection:', error);
    }
}

process.once('SIGINT', async () => {
    console.log('Cleaning up attendance service connections...');
    await cleanup();
    process.exit(0);
});

process.once('SIGTERM', async () => {
    console.log('Cleaning up attendance service connections...');
    await cleanup();
    process.exit(0);
});
