const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        // Create database file in server directory
        const dbPath = path.join(__dirname, 'pro-upscaler.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('📊 Connected to SQLite database');
                this.initializeTables();
            }
        });
    }

    initializeTables() {
        // Create users table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                subscription_tier TEXT DEFAULT 'free',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create usage logs table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                processing_type TEXT NOT NULL,
                image_size INTEGER,
                processing_time INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create subscription tiers table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS subscription_tiers (
                tier_name TEXT PRIMARY KEY,
                max_2x_4x INTEGER,
                max_8x INTEGER,
                max_ai_enhancements INTEGER,
                price_monthly DECIMAL(10,2)
            )
        `);

        // Insert default subscription tiers
        this.db.run(`
            INSERT OR REPLACE INTO subscription_tiers VALUES 
            ('free', -1, 0, 3, 0.00),
            ('basic', -1, -1, 10, 9.99),
            ('pro', -1, -1, -1, 19.99)
        `);

        console.log('✅ Database tables initialized');
    }

    // User management methods
    createUser(email, passwordHash, callback) {
        const stmt = this.db.prepare(`
            INSERT INTO users (email, password_hash) VALUES (?, ?)
        `);
        
        stmt.run([email, passwordHash], function(err) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, { id: this.lastID, email, subscription_tier: 'free' });
            }
        });
        
        stmt.finalize();
    }

    getUserByEmail(email, callback) {
        this.db.get(
            'SELECT * FROM users WHERE email = ?',
            [email],
            callback
        );
    }

    getUserById(id, callback) {
        this.db.get(
            'SELECT id, email, subscription_tier, created_at FROM users WHERE id = ?',
            [id],
            callback
        );
    }

    // Usage tracking methods
    logUsage(userId, processingType, imageSize, processingTime, callback) {
        const stmt = this.db.prepare(`
            INSERT INTO usage_logs (user_id, processing_type, image_size, processing_time)
            VALUES (?, ?, ?, ?)
        `);
        
        stmt.run([userId, processingType, imageSize, processingTime], callback);
        stmt.finalize();
    }

    getCurrentMonthUsage(userId, callback) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        this.db.all(`
            SELECT 
                processing_type,
                COUNT(*) as count
            FROM usage_logs 
            WHERE user_id = ? AND created_at >= ?
            GROUP BY processing_type
        `, [userId, startOfMonth.toISOString()], (err, rows) => {
            if (err) {
                callback(err, null);
                return;
            }

            // Convert to object format
            const usage = {
                standard: 0,
                highres: 0,
                ai_enhancement: 0
            };

            rows.forEach(row => {
                if (row.processing_type === 'standard') {
                    usage.standard = row.count;
                } else if (row.processing_type === 'highres') {
                    usage.highres = row.count;
                } else if (row.processing_type === 'ai_enhancement') {
                    usage.ai_enhancement = row.count;
                }
            });

            callback(null, usage);
        });
    }

    getSubscriptionLimits(tier, callback) {
        this.db.get(
            'SELECT * FROM subscription_tiers WHERE tier_name = ?',
            [tier],
            callback
        );
    }

    checkUsageLimits(userId, processingType, callback) {
        // First get user's subscription tier
        this.getUserById(userId, (err, user) => {
            if (err || !user) {
                callback(err || new Error('User not found'), null);
                return;
            }

            // Get subscription limits
            this.getSubscriptionLimits(user.subscription_tier, (err, limits) => {
                if (err || !limits) {
                    callback(err || new Error('Subscription tier not found'), null);
                    return;
                }

                // Get current usage
                this.getCurrentMonthUsage(userId, (err, usage) => {
                    if (err) {
                        callback(err, null);
                        return;
                    }

                    // Check limits based on processing type
                    let allowed = true;
                    let reason = '';
                    if (processingType === 'ai_enhancement') {
                        if (limits.max_ai_enhancements !== -1 && usage.ai_enhancement >= limits.max_ai_enhancements) {
                            allowed = false;
                            reason = `AI Enhancement limit reached (${limits.max_ai_enhancements}/month).`;
                        }
                    } else if (processingType === 'highres') {
                        if (limits.max_8x === 0) {
                            allowed = false;
                            reason = 'High resolution upscaling requires Basic or Pro subscription.';
                        }
                    }
                    // Standard processing (2x, 4x) is unlimited for all tiers

                    callback(null, {
                        allowed,
                        reason,
                        usage,
                        limits
                    });
                });
            });
        });
    }

    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('📊 Database connection closed');
            }
        });
    }
}

module.exports = Database; 