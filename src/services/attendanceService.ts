import { Pool } from 'pg';
import { config } from '../config/config';

class DatabaseConnectionManager {
    private static instance: DatabaseConnectionManager;
    private pool: Pool | null = null;
    private readonly IDLE_TIMEOUT = 5 * 60 * 1000;
    private lastUsedTime: number = 0;
    private cleanupTimeout: NodeJS.Timeout | null = null;

    private constructor() {}

    public static getInstance(): DatabaseConnectionManager {
        if (!DatabaseConnectionManager.instance) {
            DatabaseConnectionManager.instance = new DatabaseConnectionManager();
        }
        return DatabaseConnectionManager.instance;
    }

    public async getConnection(): Promise<Pool> {
        if (this.pool) {
            await this.validateConnection();
            this.refreshTimeout();
            return this.pool;
        }

        this.pool = await this.createConnection();
        this.refreshTimeout();
        return this.pool;
    }

    private async createConnection(): Promise<Pool> {
        const pool = new Pool({
            host: config.ATTENDANCE_DB.host,
            port: config.ATTENDANCE_DB.port,
            user: config.ATTENDANCE_DB.username,
            password: config.ATTENDANCE_DB.password,
            database: config.ATTENDANCE_DB.database,
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            ssl: {
                rejectUnauthorized: false // Required for Heroku/similar platforms
            }
        });

        pool.on('error', (err: Error) => {
            console.error('Database connection error:', err);
            this.pool = null;
        });

        // Test the connection
        await pool.query('SELECT 1');
        this.lastUsedTime = Date.now();
        return pool;
    }

    private async validateConnection(): Promise<void> {
        try {
            await this.pool?.query('SELECT 1');
            this.lastUsedTime = Date.now();
        } catch (error) {
            console.log('Connection validation failed, will create new connection');
            await this.cleanup();
            this.pool = null;
        }
    }

    private refreshTimeout(): void {
        if (this.cleanupTimeout) {
            clearTimeout(this.cleanupTimeout);
        }

        this.cleanupTimeout = setTimeout(async () => {
            if (Date.now() - this.lastUsedTime >= this.IDLE_TIMEOUT) {
                await this.cleanup();
            }
        }, this.IDLE_TIMEOUT);
    }

    public async cleanup(): Promise<void> {
        if (this.cleanupTimeout) {
            clearTimeout(this.cleanupTimeout);
            this.cleanupTimeout = null;
        }

        if (this.pool) {
            await this.pool.end();
            this.pool = null;
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
        const pool = await dbManager.getConnection();
        
        const result = await pool.query(
            'SELECT date, player, minutes, raid_type, status FROM RaidActivity WHERE player = $1',
            [playerNickname]
        );

        return result.rows.map(row => ({
            date: new Date(row.date),
            minutes: Number(row.minutes),
            raid_type: row.raid_type,
            status: row.status
        }));
    } catch (error) {
        console.error('Error fetching player attendance:', error);
        throw error;
    }
}
