const express = require('express');
const cors = require('cors');
const path = require('path');

class ProUpscalerServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3002;
        this.sessions = new Map();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.startServer();
    }
    
    setupMiddleware() {
        this.app.use(cors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true
        }));
        
        this.app.use(express.json({ limit: '100mb' }));
        this.app.use(express.static(path.join(__dirname, '../client')));
        
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    
    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: Date.now() });
        });
        
        this.app.post('/api/process', async (req, res) => {
            try {
                const { imageData, scaleFactor, format, quality } = req.body;
                
                if (!imageData || !scaleFactor) {
                    return res.status(400).json({ error: 'Missing required parameters' });
                }
                
                const sessionId = Date.now().toString();
                const session = {
                    id: sessionId,
                    status: 'processing',
                    startTime: Date.now(),
                    config: { scaleFactor, format, quality }
                };
                
                this.sessions.set(sessionId, session);
                
                setTimeout(() => {
                    session.status = 'complete';
                    session.endTime = Date.now();
                }, 2000);
                
                res.json({ sessionId, status: 'started' });
                
            } catch (error) {
                console.error('Processing error:', error);
                res.status(500).json({ error: 'Processing failed' });
            }
        });
        
        this.app.get('/api/session/:id', (req, res) => {
            const session = this.sessions.get(req.params.id);
            
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            
            res.json(session);
        });
        
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/index.html'));
        });
        
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
    }
    
    startServer() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Pro Upscaler Server running on port ${this.port}`);
            console.log(`📱 Web app: http://localhost:${this.port}`);
        });
    }
}

if (require.main === module) {
    new ProUpscalerServer();
}

module.exports = ProUpscalerServer;
