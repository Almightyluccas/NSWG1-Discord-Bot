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
        const hasChanged = 
            this.currentData.onlinePlayers !== data.onlinePlayers || 
            JSON.stringify(this.currentData.playerNames) !== JSON.stringify(data.playerNames);

        this.currentData = {
            onlinePlayers: data.onlinePlayers,
            playerNames: [...data.playerNames]
        };

        if (hasChanged) {
            this.emit('serverDataUpdated', this.currentData);
        }
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

        serverStatus.updateServerData(data);
        res.status(200).json({ message: 'Server status updated successfully' });
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