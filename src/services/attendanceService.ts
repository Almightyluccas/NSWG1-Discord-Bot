import mysql from 'mysql2/promise';
import { config } from '../config/config';

const pool = mysql.createPool({
    host: config.ATTENDANCE_DB_HOST,
    user: config.ATTENDANCE_DB_USERNAME,
    password: config.ATTENDANCE_DB_PASSWORD,
    database: config.ATTENDANCE_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export const TRACKING_START_DATE = new Date(Date.UTC(2025, 1, 8));

export interface AttendanceRecord {
    date: Date;
    minutes: number;
    raid_type: string;
    status?: string;
}

export async function getPlayerAttendance(playerNickname: string): Promise<AttendanceRecord[]> {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [rows] = await connection.query<mysql.RowDataPacket[]>(
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
        return [];
    } finally {
        if (connection) connection.release();
    }
}

export async function cleanup(): Promise<void> {
    await pool.end();
}

process.on('SIGINT', async () => {
    console.log('Cleaning up attendance service connections...');
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Cleaning up attendance service connections...');
    await cleanup();
    process.exit(0);
});
