import mysql from 'mysql2/promise';
import { config } from '../config/config';

class DatabaseConnectionManager {
    private static instance: DatabaseConnectionManager;
    private connection: mysql.Connection | null = null;
    private connectionPromise: Promise<mysql.Connection> | null = null;
    private connectionTimeout: NodeJS.Timeout | null = null;
    private readonly IDLE_TIMEOUT = 5 * 60 * 1000;

    private constructor() {}

    public static getInstance(): DatabaseConnectionManager {
        if (!DatabaseConnectionManager.instance) {
            DatabaseConnectionManager.instance = new DatabaseConnectionManager();
        }
        return DatabaseConnectionManager.instance;
    }

    public async getConnection(): Promise<mysql.Connection> {
        if (this.connection) {
            this.refreshTimeout();
            return this.connection;
        }

        if (this.connectionPromise) {
            return await this.connectionPromise;
        }

        this.connectionPromise = this.createConnection();
        try {
            this.connection = await this.connectionPromise;
            this.refreshTimeout();
            return this.connection;
        } finally {
            this.connectionPromise = null;
        }
    }

    private async createConnection(): Promise<mysql.Connection> {
        const connection = await mysql.createConnection({
            host: config.ATTENDANCE_DB.host,
            user: config.ATTENDANCE_DB.username,
            password: config.ATTENDANCE_DB.password,
            database: config.ATTENDANCE_DB.database,
            multipleStatements: true
        });

        connection.on('error', async (err) => {
            console.error('Database connection error:', err);
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.log('Reconnecting to database...');
                this.connection = null;
                await this.cleanup();
            }
        });

        return connection;
    }

    private refreshTimeout(): void {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }

        this.connectionTimeout = setTimeout(async () => {
            await this.cleanup();
        }, this.IDLE_TIMEOUT);
    }

    public async cleanup(): Promise<void> {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }

        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }
}

export const TRACKING_START_DATE = new Date(Date.UTC(2025, 1, 1));

export interface AttendanceRecord {
    date: Date;
    minutes: number;
    raid_type: string;
    status?: string;
}

const dbManager = DatabaseConnectionManager.getInstance();

export async function getPlayerAttendance(playerNickname: string): Promise<AttendanceRecord[]> {
    try {
        const conn = await dbManager.getConnection();
        
        const [rows] = await conn.query<mysql.RowDataPacket[]>(
            'SELECT date, player, minutes, raid_type, status FROM RaidActivity WHERE player = ?',
            [playerNickname]
        );

        return rows.map(row => {
            const timestamp = typeof row.date === 'string' ? parseInt(row.date) : Number(row.date);
            return {
                date: new Date(timestamp),
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
