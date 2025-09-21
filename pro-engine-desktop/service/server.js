const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const ImageProcessor = require('./image-processor');
const HardwareDetector = require('./hardware-detector');
const FileManager = require('./file-manager');

class ProEngineDesktopService {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3006;
        this.sessions = new Map();
        this.imageProcessor = new ImageProcessor();
        this.hardwareDetector = new HardwareDetector();
        this.fileManager = new FileManager();
        
        this.setupMiddleware();
        this.setupRoutes();
    }
    
    setupMiddleware() {
        // CORS for browser communication
        this.app.use(cors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002', 'http://localhost:8080'],
            credentials: true,
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        // Parse large JSON payloads for image data (2GB to account for Base64 overhead - 1.5GB files)
        this.app.use(express.json({ limit: '2000mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '2000mb' }));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    
    setupRoutes() {
        // Root endpoint - service information
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Pro Engine Desktop Service',
                version: '1.0.0',
                status: 'running',
                endpoints: {
                    health: '/health',
                    capabilities: '/api/capabilities',
                    processLarge: '/api/process-large',
                    progress: '/api/progress/:sessionId',
                    download: '/api/download/:sessionId',
                    test: '/test'
                },
                documentation: 'See README.md for API documentation'
            });
        });
        
        // Serve the simple test page
        this.app.get('/test', (req, res) => {
            res.sendFile(path.join(__dirname, 'simple-test.html'));
        });
        
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'Pro Engine Desktop Service',
                version: '1.0.0',
                timestamp: Date.now(),
                capabilities: this.hardwareDetector.getCapabilities()
            });
        });
        
        // System capabilities endpoint
        this.app.get('/api/capabilities', async (req, res) => {
            try {
                const capabilities = await this.hardwareDetector.detectSystemCapabilities();
                res.json({
                    capabilities,
                    optimalMethod: 'sharp-cpu-optimized',
                    expectedPerformance: this.hardwareDetector.estimatePerformance(capabilities)
                });
            } catch (error) {
                console.error('Capabilities detection error:', error);
                res.status(500).json({ error: 'Failed to detect system capabilities' });
            }
        });
        
        // Add this route for debugging Sharp configuration
        this.app.get('/api/sharp-info', (req, res) => {
            const sharp = require('sharp');
            const sharpInfo = {
                versions: sharp.versions,
                cache: sharp.cache(),
                concurrency: sharp.concurrency(),
                simd: sharp.simd(),
                // Test pixel limit
                defaultPixelLimit: 'Testing in progress...'
            };
            
            console.log('🔍 Sharp configuration:', sharpInfo);
            res.json(sharpInfo);
        });
        
        // Process large image endpoint
        this.app.post('/api/process-large', async (req, res) => {
            try {
                const { sessionId, imageData, scaleFactor, format, quality, customFilename, customLocation } = req.body;
                
                // Validate request
                if (!sessionId || !imageData || !scaleFactor) {
                    return res.status(400).json({ 
                        error: 'Missing required parameters: sessionId, imageData, scaleFactor' 
                    });
                }
                
                // Create processing session
                const session = {
                    id: sessionId,
                    status: 'queued',
                    startTime: Date.now(),
                    config: {
                        scaleFactor: parseInt(scaleFactor),
                        format: format || 'png',
                        quality: parseInt(quality || 95),
                        customFilename: customFilename || null,
                        customLocation: customLocation || null
                    },
                    progress: 0,
                    message: 'Processing queued...'
                };
                
                this.sessions.set(sessionId, session);
                
                // Start processing asynchronously
                this.processImageAsync(sessionId, imageData, session.config);
                
                res.json({
                    sessionId,
                    status: 'queued',
                    message: 'Processing started'
                });
                
            } catch (error) {
                console.error('Process request error:', error);
                res.status(500).json({
                    error: 'Failed to start processing',
                    details: error.message
                });
            }
        });
        
        // Progress monitoring endpoint (Server-Sent Events)
        this.app.get('/api/progress/:sessionId', (req, res) => {
            const { sessionId } = req.params;
            const session = this.sessions.get(sessionId);
            
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            
            // Setup Server-Sent Events
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });
            
            // Send current status immediately
            this.sendProgressUpdate(res, session);
            
            // Setup progress monitoring
            const progressInterval = setInterval(() => {
                const currentSession = this.sessions.get(sessionId);
                if (!currentSession) {
                    clearInterval(progressInterval);
                    res.end();
                    return;
                }
                
                this.sendProgressUpdate(res, currentSession);
                
                // End connection when complete or error
                if (currentSession.status === 'complete' || currentSession.status === 'error') {
                    clearInterval(progressInterval);
                    setTimeout(() => res.end(), 1000); // Give time for final update
                }
            }, 500); // Update every 500ms
            
            // Cleanup on client disconnect
            req.on('close', () => {
                clearInterval(progressInterval);
            });
        });
        
        // AI-enhanced processing endpoint
        this.app.post('/api/process-with-ai', async (req, res) => {
            try {
                const { sessionId, imageData, scaleFactor, format, quality, customFilename, customLocation, aiPreferences = {} } = req.body;
                
                if (!sessionId || !imageData || !scaleFactor) {
                    return res.status(400).json({ 
                        error: 'Missing required parameters: sessionId, imageData, scaleFactor' 
                    });
                }
                
                console.log(`🚀 Starting AI-enhanced processing: ${scaleFactor}x scale`);
                
                const session = {
                    id: sessionId,
                    status: 'queued',
                    startTime: Date.now(),
                    config: {
                        scaleFactor: parseInt(scaleFactor),
                        format: format || 'png',
                        quality: parseInt(quality || 95),
                        customFilename: customFilename || null,
                        customLocation: customLocation || null,
                        aiPreferences: aiPreferences
                    },
                    progress: 0,
                    message: 'AI processing queued...',
                    aiEnhancement: true
                };
                
                this.sessions.set(sessionId, session);
                
                // Start AI processing asynchronously
                this.processImageWithAIAsync(sessionId, imageData, session.config);
                
                res.json({
                    sessionId,
                    status: 'queued',
                    message: 'AI processing started'
                });
                
            } catch (error) {
                console.error('AI processing request error:', error);
                res.status(500).json({
                    error: 'Failed to start AI processing',
                    details: error.message
                });
            }
        });

        // Download processed file endpoint
        this.app.get('/api/download/:sessionId', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const session = this.sessions.get(sessionId);
                
                if (!session) {
                    return res.status(404).json({ error: 'Session not found' });
                }
                
                if (session.status !== 'complete') {
                    return res.status(400).json({ 
                        error: 'Processing not complete',
                        status: session.status 
                    });
                }
                
                const filePath = session.result.outputPath;
                const filename = session.result.filename;
                
                // Stream file to response
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                
                const fileBuffer = await fs.readFile(filePath);
                res.send(fileBuffer);
                
                // Schedule cleanup
                setTimeout(() => this.cleanupSession(sessionId), 5000);
                
            } catch (error) {
                console.error('Download error:', error);
                res.status(500).json({
                    error: 'Download failed',
                    details: error.message
                });
            }
        });
        
        // Note: TIFF preview generation moved to client-side for simplicity

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        });
    }
    
    sendProgressUpdate(res, session) {
        const data = JSON.stringify({
            sessionId: session.id,
            status: session.status,
            progress: session.progress,
            message: session.message,
            timestamp: Date.now()
        });
        
        res.write(`data: ${data}\n\n`);
    }
    
    async processImageAsync(sessionId, imageData, config) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        try {
            session.status = 'processing';
            session.message = 'Starting image processing...';
            
            // Convert data URL to buffer
            const base64Data = imageData.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Process image using the optimized multi-threading engine
            const processedImage = await this.imageProcessor.processImage(
                imageBuffer,
                config.scaleFactor,
                (progressData) => {
                    console.log('📊 Progress callback received:', progressData);
                    session.progress = progressData.progress || 0;
                    session.message = progressData.stage === 'processing' ? 'Multi-threaded processing...' : 
                                      progressData.stage === 'complete' ? 'Processing complete!' : 
                                      'Processing...';
                }
            );
            
            // Get image info for result metadata
            const imageInfo = await this.imageProcessor.getImageInfo(imageBuffer);
            const result = {
                buffer: processedImage.buffer || processedImage,
                format: processedImage.format || 'png',
                extension: processedImage.extension || 'png',
                fileSize: (processedImage.buffer || processedImage).length,
                dimensions: {
                    width: Math.round(imageInfo.width * config.scaleFactor),
                    height: Math.round(imageInfo.height * config.scaleFactor)
                }
            };
            
            // Save to user's downloads folder using the new format structure
            const saveResult = await this.fileManager.saveProcessedImage(
                processedImage,
                sessionId,
                config.customFilename,
                config.customLocation
            );
            
            session.status = 'complete';
            session.progress = 100;
            session.message = 'Processing complete!';
            session.endTime = Date.now();
            session.result = {
                outputPath: saveResult.filepath,
                filename: saveResult.filename,
                fileSize: result.fileSize,
                dimensions: result.dimensions,
                format: saveResult.format,
                processingTime: session.endTime - session.startTime
            };
            
            console.log(`✅ Processing complete for session ${sessionId}: ${session.result.filename}`);
            
        } catch (error) {
            console.error(`❌ Processing failed for session ${sessionId}:`, error);
            session.status = 'error';
            session.error = error.message;
            session.message = 'Processing failed: ' + error.message;
        }
    }
    
    async processImageWithAIAsync(sessionId, imageData, config) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        try {
            session.status = 'processing';
            session.message = 'Starting AI-enhanced processing...';
            
            // Convert data URL to buffer
            const base64Data = imageData.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Use AI-enhanced processing
            const processedImage = await this.imageProcessor.processImageWithAI(
                imageBuffer,
                config.scaleFactor,
                (progressData) => {
                    console.log('📊 AI Progress callback received:', progressData);
                    session.progress = progressData.progress || 0;
                    session.message = progressData.stage === 'ai-complete' ? 'AI enhancement complete, continuing with scaling...' : 
                                      progressData.stage === 'scaling-complete' ? 'Scaling complete!' : 
                                      progressData.stage === 'processing' ? 'AI-enhanced processing...' :
                                      'Processing...';
                },
                config.aiPreferences
            );
            
            // Get image info for result metadata
            const imageInfo = await this.imageProcessor.getImageInfo(imageBuffer);
            const result = {
                buffer: processedImage.buffer || processedImage,
                format: processedImage.format || 'png',
                extension: processedImage.extension || 'png',
                fileSize: (processedImage.buffer || processedImage).length,
                dimensions: {
                    width: Math.round(imageInfo.width * config.scaleFactor),
                    height: Math.round(imageInfo.height * config.scaleFactor)
                }
            };
            
            // Save to user's downloads folder using the new format structure
            const saveResult = await this.fileManager.saveProcessedImage(
                processedImage,
                sessionId,
                config.customFilename,
                config.customLocation
            );
            
            session.status = 'complete';
            session.progress = 100;
            session.message = 'AI-enhanced processing complete!';
            session.endTime = Date.now();
            session.result = {
                outputPath: saveResult.filepath,
                filename: saveResult.filename,
                fileSize: result.fileSize,
                dimensions: result.dimensions,
                format: saveResult.format,
                processingTime: session.endTime - session.startTime,
                aiEnhanced: true
            };
            
            console.log(`✅ AI processing complete for session ${sessionId}: ${session.result.filename}`);
            
        } catch (error) {
            console.error(`❌ AI processing failed for session ${sessionId}:`, error);
            session.status = 'error';
            session.error = error.message;
            session.message = 'AI processing failed: ' + error.message;
        }
    }

    async cleanupSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        try {
            // Delete temporary files if any
            if (session.result && session.result.outputPath) {
                // Don't delete the final output file - user needs it
                // Only cleanup temporary processing files if any exist
            }
            
            this.sessions.delete(sessionId);
            console.log(`🧹 Cleaned up session: ${sessionId}`);
        } catch (error) {
            console.error(`Failed to cleanup session ${sessionId}:`, error);
        }
    }
    
    async start() {
        try {
            // Initialize components
            await this.hardwareDetector.initialize();
            await this.imageProcessor.initialize();
            await this.fileManager.initialize();
            
            // Start server
            this.server = this.app.listen(this.port, () => {
                console.log(`🚀 Pro Engine Desktop Service running on port ${this.port}`);
                console.log(`📊 System capabilities:`, this.hardwareDetector.getCapabilities());
                console.log(`💾 Output directory:`, this.fileManager.getOutputDirectory());
            });
            
            // Cleanup interval for old sessions
            setInterval(() => {
                this.cleanupOldSessions();
            }, 30 * 60 * 1000); // Every 30 minutes
            
        } catch (error) {
            console.error('Failed to start Pro Engine Desktop Service:', error);
            process.exit(1);
        }
    }
    
    cleanupOldSessions() {
        const now = Date.now();
        const maxAge = 2 * 60 * 60 * 1000; // 2 hours
        
        for (const [sessionId, session] of this.sessions) {
            if (now - session.startTime > maxAge) {
                this.cleanupSession(sessionId);
            }
        }
    }
    
    async stop() {
        if (this.server) {
            this.server.close();
            console.log('🛑 Pro Engine Desktop Service stopped');
        }
    }
}

// Start service if running directly
if (require.main === module) {
    const service = new ProEngineDesktopService();
    service.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await service.stop();
        process.exit(0);
    });
}

module.exports = ProEngineDesktopService; 