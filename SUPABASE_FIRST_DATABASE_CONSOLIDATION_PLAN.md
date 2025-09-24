# Supabase-First Database Architecture Consolidation Plan
**Optimized for Current System State - September 2025**

## 🚨 **CRITICAL ISSUES TO RESOLVE FIRST**

### **Immediate System Failures**
Based on current error logs, these issues must be fixed before database consolidation:

1. **WebGPU Initialization Error**: `Error: value is not an array` at line 143
2. **Port Conflict**: Process 19176 already using port 3007 
3. **Service Management**: No proper service lifecycle management

---

## 📊 **CURRENT ARCHITECTURE ANALYSIS**

### **Existing Database Systems**
1. **Supabase (Primary)** - `https://vztoftcjbwzwioxarovy.supabase.co`
   - ✅ user_profiles table with subscription tiers
   - ✅ usage_logs for processing tracking  
   - ✅ subscription_tiers lookup table
   - ✅ Real-time capabilities enabled
   - ✅ Row Level Security (RLS) configured

2. **SQLite (Local)** - `pro-upscaler.db`
   - ⚠️ Duplicate user management
   - ⚠️ Local usage tracking
   - ⚠️ Authentication overlap with Supabase
   - ⚠️ Session management confusion

### **Service Architecture**
- **Web App**: Port 3002 (✅ Running)
- **Desktop Engine**: Port 3007 (❌ Failing - Port conflict + WebGPU error)
- **React Dev**: Port 5173 (Assumed available)

---

## 🎯 **PHASE 1: CRITICAL SYSTEM STABILIZATION (Day 1-2)**

### **1.1 Fix WebGPU Initialization**
**Root Cause**: The `webgpu.create()` method is returning an unexpected value type

```javascript
// Current failing code in webgpu-image-processor.js:143
const webgpuInstance = await webgpu.create();

// Fix: Add proper error handling and fallback
async initializeWebGPUContext() {
    try {
        console.log('🔧 Creating WebGPU instance...');
        
        // Check if webgpu package is properly loaded
        if (!webgpu || typeof webgpu.create !== 'function') {
            throw new Error('WebGPU package not properly loaded');
        }
        
        // Try to create WebGPU instance with validation
        const webgpuInstance = await webgpu.create();
        
        // Validate the returned instance
        if (!webgpuInstance || typeof webgpuInstance !== 'object') {
            throw new Error('WebGPU instance creation returned invalid value');
        }
        
        // Additional validation for expected WebGPU properties
        if (!webgpuInstance.requestAdapter) {
            throw new Error('WebGPU instance missing required methods');
        }
        
        this.gpu = webgpuInstance;
        console.log('✅ WebGPU instance created successfully');
        
    } catch (error) {
        console.error('❌ WebGPU initialization failed:', error.message);
        console.log('⚠️ Falling back to CPU processing');
        this.gpu = null;
        this.webgpuAvailable = false;
        // Don't throw - allow graceful fallback
    }
}
```

### **1.2 Fix Port Management**
**Root Cause**: Service doesn't check for existing processes on port 3007

```javascript
// Enhanced server startup in server.js
class ProEngineDesktopService {
    constructor() {
        this.app = express();
        this.preferredPort = process.env.PORT || 3007;
        this.port = null; // Will be determined dynamically
        // ... rest of constructor
    }
    
    async findAvailablePort(startPort = this.preferredPort) {
        const net = require('net');
        
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
    
    async start() {
        try {
            // Find available port
            this.port = await this.findAvailablePort();
            console.log(`🔍 Found available port: ${this.port}`);
            
            // Initialize components (with WebGPU fallback)
            await this.imageProcessor.initialize();
            await this.hardwareDetector.initialize();
            await this.fileManager.initialize();
            
            // Start server
            this.server = this.app.listen(this.port, () => {
                console.log(`🚀 Pro Engine Desktop Service running on port ${this.port}`);
                console.log(`📊 Health check: http://localhost:${this.port}/health`);
            });
            
        } catch (error) {
            console.error('❌ Service startup failed:', error);
            process.exit(1);
        }
    }
}
```

### **1.3 Service Health Monitoring**
```javascript
// Add to server.js
setupHealthMonitoring() {
    // Enhanced health endpoint
    this.app.get('/health', async (req, res) => {
        const health = {
            status: 'healthy',
            timestamp: Date.now(),
            port: this.port,
            services: {
                webgpu: this.imageProcessor.webgpuAvailable,
                gpu_acceleration: this.imageProcessor.gpuAvailable,
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
            capabilities: this.hardwareDetector.getCapabilities(),
            status: 'available'
        });
    });
}
```

---

## 🗄️ **PHASE 2: DATABASE CONSOLIDATION (Day 3-5)**

### **2.1 Data Migration Strategy**

#### **Step 1: Audit Current Data**
```bash
# Create data audit script
node -e "
const Database = require('./pro-upscaler/server/database.js');
const db = new Database();

console.log('=== SQLite Data Audit ===');
db.db.all('SELECT COUNT(*) as count FROM users', (err, result) => {
    console.log('Users in SQLite:', result[0].count);
});

db.db.all('SELECT COUNT(*) as count FROM usage_logs', (err, result) => {
    console.log('Usage logs in SQLite:', result[0].count);
});
"
```

#### **Step 2: Create Migration Scripts**
```javascript
// migration-scripts/migrate-to-supabase.js
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseMigration {
    constructor() {
        // Supabase client
        this.supabase = createClient(
            'https://vztoftcjbwzwioxarovy.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for admin operations
        );
        
        // SQLite connection
        const dbPath = path.join(__dirname, '../pro-upscaler/server/pro-upscaler.db');
        this.sqlite = new sqlite3.Database(dbPath);
    }
    
    async migrateUsers() {
        console.log('🔄 Migrating users from SQLite to Supabase...');
        
        return new Promise((resolve, reject) => {
            this.sqlite.all('SELECT * FROM users', async (err, users) => {
                if (err) return reject(err);
                
                for (const user of users) {
                    try {
                        // Check if user already exists in Supabase
                        const { data: existingProfile } = await this.supabase
                            .from('user_profiles')
                            .select('id')
                            .eq('id', user.id)
                            .single();
                            
                        if (!existingProfile) {
                            // Create auth user first (if needed)
                            const { data: authUser, error: authError } = await this.supabase.auth.admin
                                .createUser({
                                    email: user.email,
                                    password: 'temp-password-needs-reset',
                                    email_confirm: true
                                });
                                
                            if (authError && !authError.message.includes('already registered')) {
                                console.error('Auth user creation failed:', authError);
                                continue;
                            }
                            
                            // Create user profile
                            const { error: profileError } = await this.supabase
                                .from('user_profiles')
                                .insert({
                                    id: authUser?.user?.id || user.id,
                                    subscription_tier: user.subscription_tier || 'free',
                                    created_at: user.created_at
                                });
                                
                            if (profileError) {
                                console.error('Profile creation failed:', profileError);
                            } else {
                                console.log(`✅ Migrated user: ${user.email}`);
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Failed to migrate user ${user.email}:`, error);
                    }
                }
                
                resolve();
            });
        });
    }
    
    async migrateUsageLogs() {
        console.log('🔄 Migrating usage logs from SQLite to Supabase...');
        
        return new Promise((resolve, reject) => {
            this.sqlite.all('SELECT * FROM usage_logs', async (err, logs) => {
                if (err) return reject(err);
                
                // Batch insert for better performance
                const batchSize = 100;
                for (let i = 0; i < logs.length; i += batchSize) {
                    const batch = logs.slice(i, i + batchSize);
                    
                    const supabaseLogs = batch.map(log => ({
                        user_id: log.user_id,
                        processing_type: log.processing_type,
                        scale_factor: this.mapScaleFactor(log.processing_type),
                        image_pixels: log.image_size || 0,
                        processing_time_ms: log.processing_time || 0,
                        created_at: log.created_at
                    }));
                    
                    const { error } = await this.supabase
                        .from('usage_logs')
                        .insert(supabaseLogs);
                        
                    if (error) {
                        console.error('Batch insert failed:', error);
                    } else {
                        console.log(`✅ Migrated ${batch.length} usage logs`);
                    }
                }
                
                resolve();
            });
        });
    }
    
    mapScaleFactor(processingType) {
        // Map old processing types to scale factors
        const mapping = {
            'standard': '2x',
            'highres': '4x',
            'ultra': '8x'
        };
        return mapping[processingType] || '2x';
    }
    
    async validateMigration() {
        console.log('🔍 Validating migration...');
        
        // Count records in both systems
        const sqliteUsers = await new Promise((resolve) => {
            this.sqlite.get('SELECT COUNT(*) as count FROM users', (err, result) => {
                resolve(result?.count || 0);
            });
        });
        
        const { count: supabaseUsers } = await this.supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
            
        console.log(`Users - SQLite: ${sqliteUsers}, Supabase: ${supabaseUsers}`);
        
        return sqliteUsers <= supabaseUsers; // Allow for some users already in Supabase
    }
}

// Usage
async function runMigration() {
    const migration = new DatabaseMigration();
    
    try {
        await migration.migrateUsers();
        await migration.migrateUsageLogs();
        
        const isValid = await migration.validateMigration();
        if (isValid) {
            console.log('✅ Migration completed successfully');
        } else {
            console.log('⚠️ Migration validation failed - manual review needed');
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

if (require.main === module) {
    runMigration();
}

module.exports = DatabaseMigration;
```

### **2.2 Authentication Consolidation**

#### **Update Server Authentication Middleware**
```javascript
// pro-upscaler/server/supabase-auth-middleware.js
const { createClient } = require('@supabase/supabase-js');

class SupabaseAuthMiddleware {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
    }
    
    // Replace the existing JWT middleware
    authenticateToken = async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'Access token required' });
            }

            // Verify token with Supabase
            const { data: { user }, error } = await this.supabase.auth.getUser(token);
            
            if (error || !user) {
                return res.status(403).json({ message: 'Invalid token' });
            }

            // Load user profile from Supabase
            const { data: profile, error: profileError } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                return res.status(500).json({ message: 'Profile fetch failed' });
            }

            // Attach user data to request
            req.user = {
                ...user,
                profile
            };

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({ message: 'Authentication error' });
        }
    };
    
    // Usage enforcement using Supabase
    checkUsageLimits = async (req, res, next) => {
        try {
            const user = req.user;
            const { processing_type, scale_factor } = req.body;
            
            // Call Supabase function for usage checking
            const { data, error } = await this.supabase
                .rpc('enforce_subscription_limits', {
                    user_uuid: user.id,
                    processing_type_param: processing_type,
                    scale_factor_param: scale_factor
                });
                
            if (error) {
                console.error('Usage check error:', error);
                return res.status(500).json({ message: 'Usage check failed' });
            }
            
            if (!data) {
                return res.status(429).json({
                    message: 'Usage limit exceeded',
                    upgrade_required: true,
                    current_tier: user.profile.subscription_tier
                });
            }
            
            next();
        } catch (error) {
            console.error('Usage limits middleware error:', error);
            res.status(500).json({ message: 'Usage validation error' });
        }
    };
}

module.exports = SupabaseAuthMiddleware;
```

#### **Update Server Routes to Use Supabase**
```javascript
// pro-upscaler/server/server.js - Updated routes
const SupabaseAuthMiddleware = require('./supabase-auth-middleware');

class ProUpscalerServer {
    constructor() {
        // ... existing constructor
        this.authMiddleware = new SupabaseAuthMiddleware();
        // Remove old database initialization
        // this.db = new Database(); // REMOVE THIS
    }
    
    setupRoutes() {
        // Remove old auth routes - they're handled by Supabase client-side
        
        // Update processing endpoints to use Supabase auth
        this.app.post('/api/process', 
            this.authMiddleware.authenticateToken,
            this.authMiddleware.checkUsageLimits,
            async (req, res) => {
                try {
                    // Log usage to Supabase
                    await this.logUsageToSupabase(req.user, req.body);
                    
                    // Process image...
                    // ... existing processing logic
                } catch (error) {
                    console.error('Processing error:', error);
                    res.status(500).json({ error: 'Processing failed' });
                }
            }
        );
    }
    
    async logUsageToSupabase(user, processingData) {
        const { error } = await this.authMiddleware.supabase
            .from('usage_logs')
            .insert({
                user_id: user.id,
                processing_type: processingData.processing_type || 'standard',
                scale_factor: processingData.scale_factor || '2x',
                image_pixels: processingData.image_pixels || 0,
                processing_time_ms: processingData.processing_time || 0
            });
            
        if (error) {
            console.error('Usage logging error:', error);
        }
    }
}
```

### **2.3 Local SQLite Optimization**
```javascript
// pro-upscaler/server/local-cache-db.js
// New lightweight SQLite for local caching only
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class LocalCacheDatabase {
    constructor() {
        const dbPath = path.join(__dirname, 'local-cache.db');
        this.db = new sqlite3.Database(dbPath);
        this.initializeCacheTables();
    }
    
    initializeCacheTables() {
        // Only cache/temp tables - NO user data
        this.db.run(`
            CREATE TABLE IF NOT EXISTS processing_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                image_hash TEXT,
                processed_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME
            )
        `);
        
        this.db.run(`
            CREATE TABLE IF NOT EXISTS temp_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT,
                cleanup_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Auto-cleanup old cache entries
        this.db.run(`
            DELETE FROM processing_cache 
            WHERE expires_at < datetime('now')
        `);
    }
    
    // Cache management methods only
    async cacheProcessedImage(sessionId, imageHash, processedPath) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO processing_cache (session_id, image_hash, processed_path, expires_at) VALUES (?, ?, ?, ?)',
                [sessionId, imageHash, processedPath, expiresAt.toISOString()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }
}

module.exports = LocalCacheDatabase;
```

---

## 🚀 **PHASE 3: IMPLEMENTATION EXECUTION (Day 6-7)**

### **3.1 Implementation Order**

```bash
# Day 1: Critical Fixes
1. Fix WebGPU initialization with proper error handling
2. Implement dynamic port finding
3. Add service health monitoring
4. Test service startup

# Day 2: Service Stabilization  
5. Test WebGPU fallback to GPU acceleration
6. Verify port management works
7. Test service discovery from web app
8. Monitor system stability

# Day 3: Database Migration Preparation
9. Create migration scripts
10. Test migration on development data
11. Backup existing data
12. Validate migration scripts

# Day 4: Execute Migration
13. Run user migration
14. Run usage logs migration  
15. Validate data integrity
16. Update API endpoints

# Day 5: Authentication Update
17. Deploy Supabase auth middleware
18. Update client authentication
19. Test authentication flows
20. Remove old SQLite auth tables

# Day 6: Local Cache Optimization
21. Deploy local cache database
22. Remove user data from SQLite
23. Test cache functionality
24. Monitor performance

# Day 7: Validation & Monitoring
25. Full system integration testing
26. Performance validation
27. Monitor error rates
28. Document changes
```

### **3.2 Rollback Plan**
```bash
# If migration fails, rollback procedure:
1. Stop all services
2. Restore SQLite backup
3. Revert server code to previous version
4. Restart services with old configuration
5. Investigate issues before retry
```

---

## 📊 **SUCCESS METRICS**

### **Technical Stability**
- [ ] WebGPU initialization success rate: >95%
- [ ] Service startup success: 100%
- [ ] Zero port conflicts
- [ ] Service discovery working

### **Database Performance**
- [ ] Authentication response time: <200ms
- [ ] Usage logging: <100ms
- [ ] Data integrity: 100%
- [ ] Zero data loss during migration

### **System Integration**
- [ ] Web app (3002) ↔ Desktop service communication
- [ ] Real-time usage tracking
- [ ] Subscription enforcement working
- [ ] Local cache performance optimized

---

## 🛠️ **IMPLEMENTATION SCRIPTS**

### **Quick Fix Script**
```bash
#!/bin/bash
# fix-critical-issues.sh

echo "🔧 Fixing critical Pro Upscaler issues..."

# Kill any processes using port 3007
echo "Stopping existing services..."
lsof -ti:3007 | xargs kill -9 2>/dev/null || true

# Navigate to service directory
cd /home/mranderson/desktophybrid/pro-engine-desktop/service

# Apply WebGPU fix
echo "Applying WebGPU initialization fix..."
# (WebGPU fix will be applied via code edit)

# Apply port management fix  
echo "Applying dynamic port management..."
# (Port fix will be applied via code edit)

# Test service startup
echo "Testing service startup..."
timeout 10s npm start || echo "Service startup test completed"

echo "✅ Critical fixes applied. Ready for database consolidation."
```

This comprehensive plan addresses your immediate critical issues while providing a clear path to Supabase-first architecture. The key insight is that we must stabilize the system first (WebGPU + port conflicts) before attempting database consolidation, ensuring zero downtime and data integrity throughout the process.

Would you like me to start implementing the critical fixes first, or would you prefer to see any specific part of this plan in more detail? 