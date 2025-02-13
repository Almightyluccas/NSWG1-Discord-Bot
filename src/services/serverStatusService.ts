import express, { Request, Response, Router, NextFunction } from 'express';
import { EventEmitter } from 'events';
import { config } from '../config/config';

interface ServerData {
    onlinePlayers: number;
    playerNames: string[];
}

const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey || apiKey !== config.API_KEY) {
        res.status(401).json({ error: 'Unauthorized: Invalid API key' });
        return;
    }
    
    next();
};

class ServerStatusService extends EventEmitter {
    private static instance: ServerStatusService;
    private currentData: ServerData = {
        onlinePlayers: 0,
        playerNames: []
    };

    private constructor() {
        super();
    }

    public static getInstance(): ServerStatusService {
        if (!ServerStatusService.instance) {
            ServerStatusService.instance = new ServerStatusService();
        }
        return ServerStatusService.instance;
    }

    public updateServerData(data: ServerData): void {
        const sanitizedData = {
            onlinePlayers: Math.max(0, data.onlinePlayers || 0),
            playerNames: Array.isArray(data.playerNames) ? [...data.playerNames] : []
        };

        if (sanitizedData.playerNames.length > 0) {
            sanitizedData.onlinePlayers = Math.max(sanitizedData.playerNames.length, sanitizedData.onlinePlayers);
        }

        console.log('Updating server status:', {
            current: this.currentData,
            new: sanitizedData,
            timestamp: new Date().toISOString()
        });

        this.currentData = sanitizedData;
        this.emit('serverDataUpdated', this.getCurrentData());
    }

    public getCurrentData(): ServerData {
        return {
            onlinePlayers: this.currentData.onlinePlayers,
            playerNames: [...this.currentData.playerNames]
        };
    }
}

const app = express();
const router = Router();
app.use(express.json());

const serverStatus = ServerStatusService.getInstance();

const postServerStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = req.body as ServerData;
        
        if (!data || typeof data.onlinePlayers !== 'number' || !Array.isArray(data.playerNames)) {
            res.status(400).json({ error: 'Invalid data format' });
            return;
        }

        console.log('Received server status update:', {
            data,
            timestamp: new Date().toISOString()
        });

        serverStatus.updateServerData(data);
        res.status(200).json({ 
            message: 'Server status updated successfully',
            currentStatus: serverStatus.getCurrentData()
        });
    } catch (error) {
        console.error('Error updating server status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getServerStatus = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = serverStatus.getCurrentData();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error getting server status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

router.post('/server-status', authenticateApiKey, postServerStatus);
router.get('/server-status', authenticateApiKey, getServerStatus);

app.use('/api', router);

export { app, ServerStatusService, ServerData };