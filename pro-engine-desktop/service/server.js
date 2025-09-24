const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const net = require('net');
const ImageProcessor = require('./image-processor');
const HardwareDetector = require('./hardware-detector');
const FileManager = require('./file-manager');
const { SubscriptionVerifier } = require('./subscription-verifier');

class ProEngineDesktopService {
    constructor() {
        this.app = express();
        this.preferredPort = process.env.PORT || 3007;
        this.port = null; // Will be determined dynamically
        this.server = null;
        this.sessions = new Map();
        this.processedImages = new Map(); // Store processed images for preview
        this.imageProcessor = new ImageProcessor();
        this.hardwareDetector = new HardwareDetector();
        this.fileManager = new FileManager();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupHealthMonitoring();
    }

    async findAvailablePort(startPort = this.preferredPort) {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.listen(startPort, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            
            server.on('error', () => {
                // Port in use, try next one
                resolve(this.findAvailablePort(startPort + 1));
            });
        });
    }

    setupMiddleware() {
        // CORS for browser communication
        this.app.use(cors({
            origin: true, // Allow all origins for dev
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

        // WebGPU support endpoint - server-side WebGPU readiness
        this.app.get('/api/webgpu-status', async (req, res) => {
            try {
                const webgpuSupport = this.hardwareDetector.getWebGPUSupport();
                const performanceEstimate = this.hardwareDetector.estimateWebGPUPerformance();
                
                res.json({
                    serverSupported: webgpuSupport?.serverSupported || false,
                    supportLevel: webgpuSupport?.supportLevel || 'none',
                    gpuInfo: webgpuSupport?.gpuInfo || null,
                    requirements: webgpuSupport?.requirements || {},
                    performanceEstimate: performanceEstimate,
                    detectionTimestamp: webgpuSupport?.detectionTimestamp || Date.now(),
                    message: webgpuSupport?.serverSupported 
                        ? 'Server hardware supports WebGPU acceleration'
                        : 'Server hardware may not support WebGPU acceleration'
                });
            } catch (error) {
                console.error('WebGPU status error:', error);
                res.status(500).json({ 
                    error: 'Failed to get WebGPU status',
                    serverSupported: false,
                    supportLevel: 'none'
                });
            }
        });

        // WebGPU client capabilities endpoint - for client-side capability reporting
        this.app.post('/api/webgpu-support', async (req, res) => {
            try {
                const { clientWebGPUInfo } = req.body;
                
                // Combine server-side and client-side information
                const serverWebGPU = this.hardwareDetector.getWebGPUSupport();
                const serverPerformance = this.hardwareDetector.estimateWebGPUPerformance();
                
                const combinedInfo = {
                    server: {
                        supported: serverWebGPU?.serverSupported || false,
                        supportLevel: serverWebGPU?.supportLevel || 'none',
                        gpuInfo: serverWebGPU?.gpuInfo || null,
                        performanceEstimate: serverPerformance
                    },
                    client: clientWebGPUInfo || null,
                    recommendation: this.getWebGPURecommendation(serverWebGPU, clientWebGPUInfo),
                    timestamp: Date.now()
                };

                res.json(combinedInfo);
            } catch (error) {
                console.error('WebGPU client support error:', error);
                res.status(500).json({ 
                    error: 'Failed to process WebGPU client support info',
                    recommendation: 'use-cpu'
                });
            }
        });
        
        // Process large image endpoint
        this.app.post('/api/process-large', async (req, res) => {
            try {
                const requestStartTime = Date.now();
                const { 
                    sessionId, 
                    imageData, 
                    scaleFactor, 
                    format, 
                    quality, 
                    customFilename, 
                    customLocation,
                    // NEW: Parallel processing parameters
                    parallelConcurrency,
                    enableParallelProcessing,
                    algorithm
                } = req.body;
                
                console.log(`🚀 [${sessionId}] Non-AI processing request received`);
                
                // Validate request
                if (!sessionId || !imageData || !scaleFactor) {
                    console.error(`❌ [${sessionId}] Missing required parameters`);
                    return res.status(400).json({ 
                        error: 'Missing required parameters: sessionId, imageData, scaleFactor' 
                    });
                }
                
                console.log(`📊 [${sessionId}] Request params: scale=${scaleFactor}, format=${format}, quality=${quality}`);
                console.log(`⏱️ [${sessionId}] Request processing time: ${Date.now() - requestStartTime}ms`);
                
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
                        customLocation: customLocation || null,
                        
                        // NEW: Parallel processing configuration
                        algorithm: algorithm || 'bicubic',
                        parallelConcurrency: parseInt(parallelConcurrency || 6),
                        enableParallelProcessing: enableParallelProcessing !== false
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
            }, 2000); // Update every 2000ms (reduced from 500ms for CPU optimization)
            
            // Cleanup on client disconnect
            req.on('close', () => {
                clearInterval(progressInterval);
            });
        });

        // Progress status endpoint (JSON only - for debug console)
        this.app.get('/api/status/:sessionId', (req, res) => {
            const { sessionId } = req.params;
            const session = this.sessions.get(sessionId);
            
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            
            // Return JSON status
            res.json({
                sessionId: session.sessionId,
                status: session.status,
                progress: session.progress || 0,
                message: session.message || 'Processing...',
                processingTime: session.processingTime || 0,
                error: session.error || null,
                timestamp: Date.now()
            });
        });
        
        // AI-enhanced processing endpoint
        this.app.post('/api/process-with-ai', async (req, res) => {
            try {
                console.log('🔍 AI Processing Request received');
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                console.log('🔐 Token received:', token ? `Present (length: ${token.length})` : 'Missing');
                
                // DEVELOPMENT FALLBACK: Allow AI processing without token for testing
                let userEmail = 'dparker918@yahoo.com'; // Default test user for development
                
                if (token) {
                    // PRODUCTION PATH: Extract user email from token
                    try {
                        // Decode JWT token to get user email (without verification for simplicity)
                        const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                        userEmail = tokenPayload.email;
                        console.log('🔍 User email from token:', userEmail);
                    } catch (e) {
                        console.error('❌ Failed to decode token:', e.message);
                        return res.status(401).json({ error: 'Invalid token format' });
                    }
                } else {
                    // DEVELOPMENT FALLBACK: Use default test user
                    console.log('⚠️ No token provided, using development fallback user:', userEmail);
                }
                
                // Hardcoded Pro users list - SIMPLE AND RELIABLE
                const proUsers = ['dparker918@yahoo.com', 'testpro@example.com', 'dparker91999@gmail.com'];
                
                if (!proUsers.includes(userEmail)) {
                    console.error('❌ User not in Pro users list:', userEmail);
                    return res.status(403).json({ error: 'AI access denied', reason: 'Pro subscription required', currentTier: 'free' });
                }
                
                console.log('✅ AI access granted for hardcoded Pro user:', userEmail);

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
                        aiPreferences: aiPreferences,
                        userId: userEmail // Use email as user identifier
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
                console.error('Error stack:', error.stack);
                res.status(500).json({
                    error: 'Failed to start AI processing',
                    details: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        });

        // Pro Engine status endpoint for client detection
        this.app.get('/api/pro-engine/status', async (req, res) => {
            try {
                const lastVerified = Date.now();
                res.json({
                    service: 'Pro Engine Desktop Service',
                    version: '1.0.0',
                    aiModelsLoaded: true, // placeholder until model loader integration
                    lastVerified
                });
            } catch (e) {
                res.status(500).json({ error: 'Status failed' });
            }
        });

        // Session result endpoint for getting processing results
        this.app.get('/api/session-result/:sessionId', (req, res) => {
            try {
                const { sessionId } = req.params;
                const session = this.sessions.get(sessionId);
                
                if (!session) {
                    return res.status(404).json({ error: 'Session not found' });
                }
                
                if (session.status !== 'complete') {
                    return res.status(202).json({ 
                        status: session.status,
                        progress: session.progress,
                        message: session.message
                    });
                }
                
                res.json({
                    sessionId: sessionId,
                    status: session.status,
                    result: session.result
                });
                
            } catch (error) {
                console.error('Session result error:', error);
                res.status(500).json({ error: 'Failed to get session result' });
            }
        });

        // Enhanced preview endpoint for AI-enhanced canvas display
        this.app.get('/api/enhanced-preview/:sessionId', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const session = this.sessions.get(sessionId);
                
                if (!session) {
                    return res.status(404).json({ error: 'Session not found' });
                }
                
                // Check if we have processed image in memory first
                const processedImage = this.processedImages.get(sessionId);
                if (processedImage) {
                    console.log(`📊 [${sessionId}] Serving processed image from memory (${processedImage.buffer.length} bytes)`);
                    res.set({
                        'Content-Type': `image/${processedImage.format}`,
                        'Content-Length': processedImage.buffer.length,
                        'Cache-Control': 'no-cache',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    });
                    res.send(processedImage.buffer);
                    return;
                }
                
                // If no enhanced buffer and no processed image, try to serve the final result file
                if (!session.enhancedBuffer) {
                    console.log(`🔍 [${sessionId}] No enhanced buffer or processed image, checking for result file...`);
                    
                    if (session.status === 'complete' && session.result && session.result.outputPath) {
                        try {
                            const fs = require('fs');
                            console.log(`📁 Attempting to read file: ${session.result.outputPath}`);
                            const fileBuffer = fs.readFileSync(session.result.outputPath);
                            
                            res.set({
                                'Content-Type': 'image/png',
                                'Content-Length': fileBuffer.length,
                                'Cache-Control': 'no-cache',
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                            });
                            
                            res.send(fileBuffer);
                            console.log(`📊 Served final result as preview for session ${sessionId}: ${fileBuffer.length} bytes`);
                            return;
                        } catch (fileError) {
                            console.error('Failed to read result file:', fileError);
                            console.error('File path:', session.result?.outputPath);
                            console.error('Session status:', session.status);
                        }
                    } else {
                        console.log(`❌ Session incomplete or no result path:`, {
                            status: session.status,
                            hasResult: !!session.result,
                            hasOutputPath: !!(session.result?.outputPath)
                        });
                    }
                    return res.status(404).json({ error: 'Enhanced preview not available' });
                }
                
                res.set({
                    'Content-Type': 'image/png',
                    'Content-Length': session.enhancedBuffer.length,
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                });
                
                res.send(session.enhancedBuffer);
                console.log(`📊 Served enhanced preview for session ${sessionId}: ${session.enhancedBuffer.length} bytes`);
                
            } catch (error) {
                console.error('Enhanced preview error:', error);
                res.status(500).json({ error: 'Failed to serve enhanced preview' });
            }
        });

        // Handle CORS preflight for enhanced-preview
        this.app.options('/api/enhanced-preview/:sessionId', (req, res) => {
            res.set({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '3600'
            });
            res.status(200).end();
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
                
                // Schedule cleanup after longer delay to allow for retries
                setTimeout(() => this.cleanupSession(sessionId), 300000); // 5 minutes instead of 5 seconds
                
            } catch (error) {
                console.error('Download error:', error);
                res.status(500).json({
                    error: 'Download failed',
                    details: error.message
                });
            }
        });

        // Direct file download endpoint (works with filename instead of session)
        this.app.get('/api/file/:filename', async (req, res) => {
            try {
                const { filename } = req.params;
                // Basic path traversal protection only
                const sanitizedFilename = filename.replace(/\.\./g, '').replace(/\//g, '').replace(/\\/g, '');
                
                // Look for file in Downloads/ProUpscaler folder
                const downloadsPath = path.join(os.homedir(), 'Downloads', 'ProUpscaler');
                const filePath = path.join(downloadsPath, sanitizedFilename);
                
                // Check if file exists
                if (!await fs.access(filePath).then(() => true).catch(() => false)) {
                    return res.status(404).json({ error: 'File not found' });
                }
                
                // Get file stats for content length
                const stats = await fs.stat(filePath);
                
                // Set headers for download
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Length', stats.size);
                
                // Stream file to response
                const fileBuffer = await fs.readFile(filePath);
                res.send(fileBuffer);
                
                console.log(`📥 Direct file download: ${filename} (${stats.size} bytes)`);
                
            } catch (error) {
                console.error('Direct file download error:', error);
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

    setupHealthMonitoring() {
        // Enhanced health endpoint
        this.app.get('/health', async (req, res) => {
            const health = {
                status: 'healthy',
                timestamp: Date.now(),
                port: this.port,
                services: {
                    webgpu: this.imageProcessor.webgpuAvailable || false,
                    gpu_acceleration: this.imageProcessor.gpuAvailable || false,
                    sharp: !!sharp,
                    file_manager: !!this.fileManager,
                    hardware_detector: !!this.hardwareDetector
                },
                system: {
                    memory: process.memoryUsage(),
                    uptime: process.uptime(),
                    platform: process.platform,
                    node_version: process.version
                }
            };
            
            res.json(health);
        });
        
        // Service discovery endpoint for web app
        this.app.get('/api/service-info', (req, res) => {
            res.json({
                port: this.port,
                capabilities: this.hardwareDetector.getCapabilities ? this.hardwareDetector.getCapabilities() : {},
                status: 'available'
            });
        });
    }
    
    sendProgressUpdate(res, session) {
        const data = JSON.stringify({
            sessionId: session.id,
            status: session.status,
            progress: session.progress,
            message: session.message,
            aiEnhanced: session.aiEnhanced || false,
            timestamp: Date.now()
        });
        
        res.write(`data: ${data}\n\n`);
    }
    
    async processImageAsync(sessionId, imageData, config) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        try {
            const stepTimes = { start: Date.now() };
            console.log(`🚀 [${sessionId}] Starting image processing - Scale: ${config.scaleFactor}x`);
            
            session.status = 'processing';
            session.message = 'Starting image processing...';
            
            // Convert data URL to buffer
            console.log(`🔄 [${sessionId}] Converting data URL to buffer...`);
            const base64Data = imageData.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            stepTimes.bufferConvert = Date.now();
            console.log(`✅ [${sessionId}] Buffer conversion: ${stepTimes.bufferConvert - stepTimes.start}ms`);
            
            // Process image using WebGPU-accelerated engine with CPU fallback
            console.log(`🔄 [${sessionId}] Starting WebGPU-accelerated processing...`);
            const processedImage = await this.imageProcessor.processImageNew(
                imageBuffer,
                config.scaleFactor,
                config.format || 'jpeg',
                config.quality || 95,
                config.customFilename,
                config.customLocation,
                (progressData) => {
                    console.log(`📊 [${sessionId}] Progress: ${progressData.progress}% - ${progressData.stage || progressData.message}`);
                    session.progress = progressData.progress || 0;
                    session.message = progressData.stage === 'processing' ? 'WebGPU processing...' : 
                                      progressData.stage === 'complete' ? 'Processing complete!' : 
                                      progressData.message || 'Processing...';
                },
                // NEW: Pass parallel processing options
                {
                    algorithm: config.algorithm || 'bicubic',
                    parallelConcurrency: config.parallelConcurrency || 6,
                    enableParallelProcessing: config.enableParallelProcessing !== false
                }
            );
            stepTimes.sharpProcessing = Date.now();
            console.log(`✅ [${sessionId}] Sharp processing: ${stepTimes.sharpProcessing - stepTimes.bufferConvert}ms`);
            
            // Get image info for result metadata
            console.log(`🔄 [${sessionId}] Getting image metadata...`);
            const imageInfo = await this.imageProcessor.getImageInfo(imageBuffer);
            stepTimes.metadata = Date.now();
            console.log(`✅ [${sessionId}] Metadata extraction: ${stepTimes.metadata - stepTimes.sharpProcessing}ms`);
            console.log(`📏 [${sessionId}] Original: ${imageInfo.width}×${imageInfo.height}, Target: ${Math.round(imageInfo.width * config.scaleFactor)}×${Math.round(imageInfo.height * config.scaleFactor)}`);
            
            // Extract buffer from WebGPU result
            const resultBuffer = processedImage.data || processedImage.buffer || processedImage;
            
            console.log(`🔍 [${sessionId}] Debug - processedImage type:`, typeof processedImage);
            console.log(`🔍 [${sessionId}] Debug - processedImage keys:`, Object.keys(processedImage || {}));
            console.log(`🔍 [${sessionId}] Debug - resultBuffer type:`, typeof resultBuffer);
            console.log(`🔍 [${sessionId}] Debug - resultBuffer is Buffer:`, Buffer.isBuffer(resultBuffer));
            
            const result = {
                buffer: resultBuffer,
                format: processedImage.format || 'png',
                extension: processedImage.extension || 'png',
                fileSize: resultBuffer.length,
                dimensions: {
                    width: processedImage.width || Math.round(imageInfo.width * config.scaleFactor),
                    height: processedImage.height || Math.round(imageInfo.height * config.scaleFactor)
                }
            };
            
            // Save to user's downloads folder using the new format structure
            console.log(`🔄 [${sessionId}] Saving file to disk...`);
            const saveResult = await this.fileManager.saveProcessedImage(
                resultBuffer,
                sessionId,
                config.customFilename,
                config.customLocation
            );
            stepTimes.fileSave = Date.now();
            console.log(`✅ [${sessionId}] File save: ${stepTimes.fileSave - stepTimes.metadata}ms`);
            
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
            
            const totalTime = session.endTime - session.startTime;
            console.log(`🎉 [${sessionId}] COMPLETE - Total: ${totalTime}ms`);
            console.log(`📊 [${sessionId}] Breakdown: Buffer(${stepTimes.bufferConvert - stepTimes.start}ms) + Sharp(${stepTimes.sharpProcessing - stepTimes.bufferConvert}ms) + Metadata(${stepTimes.metadata - stepTimes.sharpProcessing}ms) + Save(${stepTimes.fileSave - stepTimes.metadata}ms)`);
            console.log(`✅ [${sessionId}] Result: ${session.result.filename} (${session.result.dimensions.width}×${session.result.dimensions.height})`);
            
            // Store processed image buffer for preview endpoint
            console.log(`💾 [${sessionId}] Storing processed image buffer for preview (${result.fileSize} bytes)`);
            this.processedImages.set(sessionId, {
                buffer: result.buffer,
                format: result.format,
                dimensions: result.dimensions,
                timestamp: Date.now()
            });
            
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
                {
                    ...config.aiPreferences,
                    outputFormat: config.format,
                    quality: config.quality
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

            // Store enhanced buffer for canvas preview
            console.log(`🔍 Debug processedImage structure:`, {
                hasEnhancedOnly: !!processedImage.enhancedOnly,
                hasAiEnhancementApplied: !!processedImage.aiEnhancementApplied,
                hasBuffer: !!processedImage.buffer,
                isBuffer: Buffer.isBuffer(processedImage),
                keys: Object.keys(processedImage)
            });
            
            if (processedImage.enhancedOnly && processedImage.aiEnhancementApplied) {
                // AI-enhanced buffer available
                session.enhancedBuffer = processedImage.enhancedOnly;
                session.aiScale = processedImage.aiScale;
                console.log(`📊 Stored AI-enhanced buffer for canvas preview: ${session.enhancedBuffer.length} bytes`);
            } else if (processedImage.buffer) {
                // Store final result buffer for preview when AI enhancement not available
                session.enhancedBuffer = processedImage.buffer;
                console.log(`📊 Stored final result buffer for canvas preview: ${processedImage.buffer.length} bytes`);
            } else if (Buffer.isBuffer(processedImage)) {
                // processedImage is directly a buffer
                session.enhancedBuffer = processedImage;
                console.log(`📊 Stored direct buffer for canvas preview: ${processedImage.length} bytes`);
            } else {
                console.log(`⚠️ No suitable buffer found for canvas preview`);
            }
            
            // Save to user's downloads folder using the new format structure
            const saveResult = await this.fileManager.saveProcessedImage(
                processedImage,
                sessionId,
                config.customFilename,
                config.customLocation
            );
            
            // Determine if AI enhancement was actually applied
            const wasAiEnhanced = !!(processedImage.enhancedOnly && processedImage.aiEnhancementApplied);
            
            session.status = 'complete';
            session.progress = 100;
            session.message = wasAiEnhanced ? 'AI-enhanced processing complete!' : 'High-quality upscaling complete!';
            session.endTime = Date.now();
            session.aiEnhanced = wasAiEnhanced; // Store AI enhancement status for progress updates
            session.result = {
                outputPath: saveResult.filepath,
                filename: saveResult.filename,
                fileSize: result.fileSize,
                dimensions: result.dimensions,
                format: saveResult.format,
                processingTime: session.endTime - session.startTime,
                aiEnhanced: wasAiEnhanced
            };
            
            // Store AI enhancement status in session for progress reporting
            session.aiEnhanced = wasAiEnhanced;
            
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

    /**
     * Get WebGPU recommendation based on server and client capabilities
     */
    getWebGPURecommendation(serverWebGPU, clientWebGPUInfo) {
        // If either server or client doesn't support WebGPU, use CPU
        if (!serverWebGPU?.serverSupported || !clientWebGPUInfo?.supported) {
            return {
                method: 'use-cpu',
                reason: !serverWebGPU?.serverSupported 
                    ? 'Server hardware does not support WebGPU'
                    : 'Client browser does not support WebGPU',
                confidence: 'high'
            };
        }

        // Both support WebGPU - determine best approach
        const serverPerf = this.hardwareDetector.estimateWebGPUPerformance();
        const clientPerf = clientWebGPUInfo.performanceEstimate;

        // If both have good performance estimates, recommend WebGPU
        if (serverPerf?.performanceMultiplier >= 3 && clientPerf?.performanceScore >= 3) {
            return {
                method: 'use-webgpu',
                reason: 'Both server and client support high-performance WebGPU',
                confidence: 'high',
                expectedSpeedup: Math.min(serverPerf.performanceMultiplier, clientPerf.speedupMultiplier)
            };
        }

        // If performance is marginal, provide cautious recommendation
        if (serverPerf?.performanceMultiplier >= 2 || clientPerf?.performanceScore >= 2) {
            return {
                method: 'try-webgpu-with-fallback',
                reason: 'WebGPU may provide performance benefits, fallback to CPU if issues occur',
                confidence: 'medium',
                expectedSpeedup: Math.min(serverPerf?.performanceMultiplier || 2, clientPerf?.speedupMultiplier || 2)
            };
        }

        // Low performance or compatibility concerns
        return {
            method: 'use-cpu',
            reason: 'WebGPU performance improvement uncertain, CPU processing more reliable',
            confidence: 'medium'
        };
    }
    
    async start() {
        try {
            // Initialize components with error handling to prevent startup failure
            try {
                await this.hardwareDetector.initialize();
                console.log('✅ Hardware detector initialized');
            } catch (error) {
                console.warn('⚠️ Hardware detector initialization failed:', error.message);
            }
            
            try {
                await this.imageProcessor.initialize();
                console.log('✅ Image processor initialized');
            } catch (error) {
                console.warn('⚠️ Image processor initialization failed, using fallback mode:', error.message);
            }
            
            try {
                await this.fileManager.initialize();
                console.log('✅ File manager initialized');
            } catch (error) {
                console.warn('⚠️ File manager initialization failed:', error.message);
            }
            
            // Find an available port
            this.port = await this.findAvailablePort();
            console.log(`�� Binding service to port: ${this.port}`);

            // Start server
            this.server = this.app.listen(this.port, () => {
                console.log(`🚀 Pro Engine Desktop Service running on port ${this.port}`);
                console.log(`📊 Health check: http://localhost:${this.port}/health`);
                console.log(`🔧 Processing endpoint: http://localhost:${this.port}/api/process-large`);
                console.log(`📊 System capabilities:`, this.hardwareDetector.getCapabilities());
                console.log(`💾 Output directory:`, this.fileManager.getOutputDirectory());
            });

            // Handle server errors gracefully
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${this.port} is already in use`);
                    console.log('🔄 Attempting to find another port...');
                    this.start(); // Retry with a different port
                } else {
                    console.error('❌ Server error:', error);
                    process.exit(1);
                }
            });
            
            // Cleanup interval for old sessions
            setInterval(() => {
                this.cleanupOldSessions();
            }, 30 * 60 * 1000); // Every 30 minutes
            
        } catch (error) {
            console.error('❌ Service startup failed:', error);
            console.log('🔄 Retrying startup in 5 seconds...');
            setTimeout(() => this.start(), 5000);
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