const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('./database');
const SupabaseAuthMiddleware = require('./supabase-auth-middleware');
const PaymentRoutes = require('./payment-routes');
const AdminRoutes = require('./admin-routes');
const fs = require('fs');
const { SubscriptionVerifier } = require('./subscription-verifier');

class ProUpscalerServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3002;
        this.sessions = new Map();
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        
        // Initialize Supabase authentication (primary)
        this.authMiddleware = new SupabaseAuthMiddleware();
        
        // Initialize payment routes
        this.paymentRoutes = new PaymentRoutes(this.authMiddleware);
        
        // Initialize admin routes
        this.adminRoutes = new AdminRoutes();
        
        // Keep SQLite database for local cache only
        this.db = new Database();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.startServer();
    }
    
    setupMiddleware() {
        this.app.use(cors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
            credentials: true
        }));
        
        this.app.use(express.json({ limit: '2000mb' })); // 2GB to account for Base64 overhead (1.5GB files)
        this.app.use(express.static(path.join(__dirname, '../client')));
        
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    
    // Legacy JWT Authentication Middleware (deprecated - use Supabase)
    authenticateToken(req, res, next) {
        // Redirect to Supabase authentication
        return this.authMiddleware.authenticateToken(req, res, next);
    }

    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: Date.now() });
        });

        // Authentication routes (DEPRECATED - use Supabase client-side)
        // Keep for backward compatibility but redirect to Supabase
        this.app.post('/auth/signup', async (req, res) => {
            res.status(410).json({ 
                message: 'Authentication moved to Supabase',
                redirect: 'Use Supabase client-side authentication'
            });
        });
        
        this.app.post('/auth/signin', async (req, res) => {
            res.status(410).json({ 
                message: 'Authentication moved to Supabase',
                redirect: 'Use Supabase client-side authentication'  
            });
        });

        // User profile and usage stats (Supabase-powered)
        this.app.get('/api/user/profile', this.authMiddleware.authenticateToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const stats = await this.authMiddleware.getUserUsageStats(userId);
                
                if (!stats) {
                    return res.status(404).json({ message: 'User profile not found' });
                }
                
                res.json({
                    user: {
                        id: userId,
                        email: req.user.email,
                        ...stats
                    }
                });
            } catch (error) {
                console.error('Profile endpoint error:', error);
                res.status(500).json({ message: 'Failed to fetch profile' });
            }
        });

        // Mount payment routes
        this.app.use('/api/payments', this.paymentRoutes.getRouter());
        
        // Mount admin routes
        this.app.use('/api/admin', this.adminRoutes.getRouter());

        // Admin interface routes (serve HTML pages)
        this.app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/admin.html'));
        });

        this.app.get('/admin-users', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/admin-users.html'));
        });

        this.app.get('/admin-analytics', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/admin-analytics.html'));
        });

        // Legacy authentication route (remove old SQLite-based auth)
        this.app.post('/auth/signup-old', async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ message: 'Email and password required' });
                }

                if (password.length < 6) {
                    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
                }

                // Hash password
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);

                // Create user
                this.db.createUser(email, passwordHash, (err, user) => {
                    if (err) {
                        if (err.code === 'SQLITE_CONSTRAINT') {
                            return res.status(400).json({ message: 'Email already exists' });
                        }
                        console.error('Signup error:', err);
                        return res.status(500).json({ message: 'Failed to create account' });
                    }

                    // Generate JWT token
                    const token = jwt.sign(
                        { userId: user.id, email: user.email },
                        this.jwtSecret,
                        { expiresIn: '7d' }
                    );

                    res.json({
                        token,
                        user: {
                            id: user.id,
                            email: user.email,
                            subscription_tier: user.subscription_tier
                        }
                    });
                });

            } catch (error) {
                console.error('Signup error:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        this.app.post('/auth/signin', async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ message: 'Email and password required' });
                }

                // Get user by email
                this.db.getUserByEmail(email, async (err, user) => {
                    if (err) {
                        console.error('Signin error:', err);
                        return res.status(500).json({ message: 'Internal server error' });
                    }

                    if (!user) {
                        return res.status(401).json({ message: 'Invalid email or password' });
                    }

                    // Check password
                    const validPassword = await bcrypt.compare(password, user.password_hash);
                    if (!validPassword) {
                        return res.status(401).json({ message: 'Invalid email or password' });
                    }

                    // Generate JWT token
                    const token = jwt.sign(
                        { userId: user.id, email: user.email },
                        this.jwtSecret,
                        { expiresIn: '7d' }
                    );

                    res.json({
                        token,
                        user: {
                            id: user.id,
                            email: user.email,
                            subscription_tier: user.subscription_tier
                        }
                    });
                });

            } catch (error) {
                console.error('Signin error:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        this.app.get('/auth/me', this.authenticateToken.bind(this), (req, res) => {
            // Get current user info
            this.db.getUserById(req.user.userId, (err, user) => {
                if (err || !user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                res.json({
                    id: user.id,
                    email: user.email,
                    subscription_tier: user.subscription_tier
                });
            });
        });

        this.app.post('/auth/check-usage', this.authenticateToken.bind(this), (req, res) => {
            const { processingType } = req.body;

            if (!processingType) {
                return res.status(400).json({ message: 'Processing type required' });
            }

            this.db.checkUsageLimits(req.user.userId, processingType, (err, result) => {
                if (err) {
                    console.error('Check usage error:', err);
                    return res.status(500).json({ message: 'Failed to check usage limits' });
                }

                res.json(result);
            });
        });

        this.app.post('/auth/log-usage', this.authenticateToken.bind(this), (req, res) => {
            const { processingType, imageSize, processingTime } = req.body;

            if (!processingType) {
                return res.status(400).json({ message: 'Processing type required' });
            }

            this.db.logUsage(
                req.user.userId,
                processingType,
                imageSize || 0,
                processingTime || 0,
                (err) => {
                    if (err) {
                        console.error('Log usage error:', err);
                        return res.status(500).json({ message: 'Failed to log usage' });
                    }

                    res.json({ success: true });
                }
            );
        });

        this.app.get('/auth/usage', this.authenticateToken.bind(this), (req, res) => {
            this.db.getCurrentMonthUsage(req.user.userId, (err, usage) => {
                if (err) {
                    console.error('Get usage error:', err);
                    return res.status(500).json({ message: 'Failed to get usage stats' });
                }

                // Also check if user should see upgrade prompt
                this.db.getUserById(req.user.userId, (err, user) => {
                    if (err || !user) {
                        return res.json(usage);
                    }

                    res.json({
                        ...usage
                    });
                });
            });
        });
        
        this.app.post('/api/process', async (req, res) => {
            try {
                console.log('🔍 Image Processing request received on Pro Upscaler Server - forwarding to WebGPU Desktop Service');
                const { imageData, scaleFactor, format, quality } = req.body;
                
                if (!imageData || !scaleFactor) {
                    return res.status(400).json({ error: 'Missing required parameters' });
                }
                
                // Generate session ID for Desktop Service
                const sessionId = Date.now().toString();
                
                // Forward the request to the WebGPU-accelerated Desktop Service (port 3007)
                const fetch = (await import('node-fetch')).default;
                const response = await fetch('http://localhost:3007/api/process-large', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.authorization || ''
                    },
                    body: JSON.stringify({
                        sessionId,
                        imageData,
                        scaleFactor,
                        format: format || 'jpeg',
                        quality: quality || 95,
                        customFilename: null,
                        customLocation: null
                    })
                });
                
                const result = await response.json();
                
                // Store session for progress tracking
                if (result.sessionId) {
                    const session = {
                        id: result.sessionId,
                        status: 'processing',
                        startTime: Date.now(),
                        config: { scaleFactor, format, quality },
                        webgpuEnabled: true
                    };
                    this.sessions.set(result.sessionId, session);
                }
                
                res.status(response.status).json(result);
                
            } catch (error) {
                console.error('❌ Image Processing forwarding error:', error);
                res.status(500).json({ 
                    error: 'Image processing failed',
                    details: error.message,
                    suggestion: 'Make sure WebGPU Desktop Service is running on port 3007'
                });
            }
        });

        // AI Enhancement endpoint - forwards to Desktop Service
        this.app.post('/api/process-with-ai', async (req, res) => {
            try {
                console.log('🔍 AI Processing request received on Pro Upscaler Server - forwarding to Desktop Service');
                
                // Forward the request to the Desktop Service (port 3007)
                const fetch = (await import('node-fetch')).default;
                const response = await fetch('http://localhost:3007/api/process-with-ai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.authorization || ''
                    },
                    body: JSON.stringify(req.body)
                });
                
                const result = await response.json();
                res.status(response.status).json(result);
                
            } catch (error) {
                console.error('❌ AI Processing forwarding error:', error);
                res.status(500).json({ 
                    error: 'AI processing failed',
                    details: error.message,
                    suggestion: 'Make sure Desktop Service is running on port 3007'
                });
            }
        });

        // Progress endpoint - forwards EventSource from Desktop Service  
        this.app.get('/api/progress/:sessionId', async (req, res) => {
            try {
                console.log(`🔍 Progress EventSource request for session ${req.params.sessionId} - setting up HTTP stream forwarding`);
                
                // Set EventSource headers
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Cache-Control'
                });
                
                // Use HTTP request instead of EventSource for forwarding
                const fetch = (await import('node-fetch')).default;
                const desktopUrl = `http://localhost:3007/api/progress/${req.params.sessionId}`;
                
                console.log(`🔗 Connecting to Desktop Service: ${desktopUrl}`);
                
                const response = await fetch(desktopUrl, {
                    headers: {
                        'Accept': 'text/event-stream',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (!response.ok) {
                    console.error(`❌ Desktop Service responded with status: ${response.status}`);
                    res.write(`data: ${JSON.stringify({ error: 'Desktop Service unavailable' })}\n\n`);
                    res.end();
                    return;
                }
                
                console.log(`✅ Connected to Desktop Service for session ${req.params.sessionId}`);
                
                // Forward the stream
                response.body.on('data', (chunk) => {
                    const data = chunk.toString();
                    console.log(`📊 Forwarding progress chunk: ${data.substring(0, 100)}...`);
                    res.write(data);
                });
                
                response.body.on('end', () => {
                    console.log(`✅ Desktop Service stream ended for session ${req.params.sessionId}`);
                    res.end();
                });
                
                response.body.on('error', (error) => {
                    console.error('❌ Stream error:', error);
                    res.write(`data: ${JSON.stringify({ error: 'Stream connection lost' })}\n\n`);
                    res.end();
                });
                
                // Clean up on client disconnect
                req.on('close', () => {
                    console.log(`🔌 Client disconnected, closing stream for session ${req.params.sessionId}`);
                    response.body.destroy();
                });
                
            } catch (error) {
                console.error('❌ Error setting up stream forwarding:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to setup progress monitoring' });
                }
            }
        });

        // Enhanced preview endpoint - forwards to Desktop Service
        this.app.get('/api/enhanced-preview/:sessionId', async (req, res) => {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(`http://localhost:3007/api/enhanced-preview/${req.params.sessionId}`);
                
                if (!response.ok) {
                    return res.status(response.status).json({ error: 'Preview not available' });
                }
                
                // Forward the image response
                res.setHeader('Content-Type', response.headers.get('content-type'));
                response.body.pipe(res);
                
            } catch (error) {
                console.error('❌ Enhanced preview forwarding error:', error);
                res.status(500).json({ error: 'Preview failed' });
            }
        });
        
        this.app.get('/api/session/:id', (req, res) => {
            const session = this.sessions.get(req.params.id);
            
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            
            res.json(session);
        });
        
        // Download endpoint for Pro Engine compatibility
        this.app.post('/download', async (req, res) => {
            try {
                console.log('📥 Download request received');
                
                // For now, redirect to desktop service or handle locally
                // This is a compatibility endpoint for the Pro Engine interface
                res.json({
                    success: true,
                    message: 'Processing initiated - check Downloads folder',
                    timestamp: Date.now()
                });
                
            } catch (error) {
                console.error('❌ Download endpoint error:', error);
                res.status(500).json({ 
                    error: 'Download failed',
                    details: error.message
                });
            }
        });
        
        // Secure Pro Engine download endpoint
        this.app.get('/download/pro-engine', async (req, res) => {
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (!token) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                const verifier = new SubscriptionVerifier();
                const accessCheck = await verifier.checkAIAccess(token);
                if (!accessCheck.hasAccess) {
                    return res.status(403).json({ 
                        error: 'Pro Engine requires active subscription',
                        reason: accessCheck.reason 
                    });
                }

                const packagePath = path.join(__dirname, 'downloads', 'pro-engine-encrypted.zip');
                if (!fs.existsSync(packagePath)) {
                    return res.status(404).json({ error: 'Package not available' });
                }

                const stat = fs.statSync(packagePath);
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Content-Disposition', 'attachment; filename="pro-upscaler-engine.zip"');

                const fileStream = fs.createReadStream(packagePath);
                fileStream.pipe(res);
            } catch (error) {
                console.error('Download error:', error);
                res.status(500).json({ error: 'Download failed' });
            }
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
            console.log(`🔐 Authentication system enabled`);
        });
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down server...');
            if (this.db) {
                this.db.close();
            }
            process.exit(0);
        });
    }
}

if (require.main === module) {
    new ProUpscalerServer();
}

module.exports = ProUpscalerServer;
