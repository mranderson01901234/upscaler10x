#!/usr/bin/env node

/**
 * SQLite to Supabase Migration Script
 * Uses existing database module to migrate data
 */

const { createClient } = require('@supabase/supabase-js');
const Database = require('./database.js');
const crypto = require('crypto');

class SupabaseMigration {
    constructor() {
        // Initialize existing database
        this.db = new Database();
        
        // Supabase client
        this.supabase = createClient(
            'https://vztoftcjbwzwioxarovy.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04'
        );

        this.stats = {
            users_migrated: 0,
            usage_logs_migrated: 0,
            errors: []
        };
    }

    generateUserId(email) {
        // Generate consistent UUID from email
        const hash = crypto.createHash('sha256').update(email).digest('hex');
        return [
            hash.substr(0, 8),
            hash.substr(8, 4),
            hash.substr(12, 4), 
            hash.substr(16, 4),
            hash.substr(20, 12)
        ].join('-');
    }

    async validateSupabase() {
        console.log('🔍 Validating Supabase connection...');
        
        try {
            const { data, error } = await this.supabase
                .from('subscription_tiers')
                .select('count', { count: 'exact', head: true });
                
            if (error) throw error;
            
            console.log('✅ Supabase connection validated');
            return true;
        } catch (error) {
            console.error('❌ Supabase validation failed:', error.message);
            return false;
        }
    }

    async migrateUsers() {
        console.log('👥 Migrating users to Supabase...');
        
        return new Promise((resolve) => {
            this.db.db.all('SELECT * FROM users', async (err, users) => {
                if (err) {
                    console.error('❌ Error fetching users:', err.message);
                    return resolve();
                }
                
                console.log(`📊 Found ${users.length} users to migrate`);
                
                for (const user of users) {
                    try {
                        const userId = this.generateUserId(user.email);
                        
                        // Check if already exists
                        const { data: existing } = await this.supabase
                            .from('user_profiles')
                            .select('id')
                            .eq('id', userId)
                            .single();
                            
                        if (existing) {
                            console.log(`⚠️  User ${user.email} already exists, skipping`);
                            continue;
                        }

                        // Insert user profile
                        const { error } = await this.supabase
                            .from('user_profiles')
                            .insert({
                                id: userId,
                                subscription_tier: user.subscription_tier || 'free',
                                created_at: user.created_at,
                                updated_at: user.updated_at || user.created_at
                            });
                            
                        if (error) {
                            console.error(`❌ Failed to migrate ${user.email}:`, error.message);
                            this.stats.errors.push({ type: 'user', email: user.email, error: error.message });
                        } else {
                            console.log(`✅ Migrated user: ${user.email} (${user.subscription_tier})`);
                            this.stats.users_migrated++;
                        }
                        
                    } catch (error) {
                        console.error(`❌ Error migrating ${user.email}:`, error.message);
                        this.stats.errors.push({ type: 'user', email: user.email, error: error.message });
                    }
                }
                
                console.log(`👥 User migration complete: ${this.stats.users_migrated} migrated`);
                resolve();
            });
        });
    }

    async migrateUsageLogs() {
        console.log('📈 Migrating usage logs to Supabase...');
        
        return new Promise((resolve) => {
            this.db.db.all('SELECT * FROM usage_logs', async (err, logs) => {
                if (err) {
                    console.error('❌ Error fetching usage logs:', err.message);
                    return resolve();
                }
                
                console.log(`📊 Found ${logs.length} usage logs to migrate`);
                
                if (logs.length === 0) {
                    console.log('✅ No usage logs to migrate');
                    return resolve();
                }

                for (const log of logs) {
                    try {
                        // Map SQLite user_id to generated UUID
                        const userId = this.generateUserId(`user-${log.user_id}`);
                        
                        const { error } = await this.supabase
                            .from('usage_logs')
                            .insert({
                                user_id: userId,
                                processing_type: log.processing_type || 'standard',
                                scale_factor: this.mapScaleFactor(log.processing_type),
                                image_pixels: log.image_size || 0,
                                processing_time_ms: log.processing_time || 0,
                                created_at: log.created_at
                            });
                            
                        if (error) {
                            console.error(`❌ Failed to migrate usage log:`, error.message);
                            this.stats.errors.push({ type: 'usage_log', error: error.message });
                        } else {
                            this.stats.usage_logs_migrated++;
                        }
                        
                    } catch (error) {
                        console.error(`❌ Error migrating usage log:`, error.message);
                        this.stats.errors.push({ type: 'usage_log', error: error.message });
                    }
                }
                
                console.log(`📈 Usage logs migration complete: ${this.stats.usage_logs_migrated} migrated`);
                resolve();
            });
        });
    }

    mapScaleFactor(processingType) {
        const mapping = {
            'standard': '2x',
            'highres': '4x', 
            'ultra': '8x',
            'ai_enhancement': '4x'
        };
        return mapping[processingType] || '2x';
    }

    async validateMigration() {
        console.log('🔍 Validating migration...');
        
        try {
            const { count: supabaseUsers } = await this.supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });
                
            const { count: supabaseUsage } = await this.supabase
                .from('usage_logs') 
                .select('*', { count: 'exact', head: true });

            console.log(`📊 Supabase now has: ${supabaseUsers || 0} users, ${supabaseUsage || 0} usage logs`);
            
            return (supabaseUsers || 0) >= this.stats.users_migrated;
            
        } catch (error) {
            console.error('❌ Validation error:', error.message);
            return false;
        }
    }

    async run() {
        console.log('🚀 STARTING SUPABASE MIGRATION');
        console.log('==============================');
        
        // Wait for database initialization
        setTimeout(async () => {
            try {
                // Validate Supabase
                const supabaseValid = await this.validateSupabase();
                if (!supabaseValid) {
                    throw new Error('Supabase validation failed');
                }

                // Migrate data
                await this.migrateUsers();
                await this.migrateUsageLogs();

                // Validate results
                const validationPassed = await this.validateMigration();
                
                // Report results
                console.log('\n📋 MIGRATION REPORT');
                console.log('===================');
                console.log(`✅ Users Migrated: ${this.stats.users_migrated}`);
                console.log(`✅ Usage Logs Migrated: ${this.stats.usage_logs_migrated}`);
                console.log(`❌ Errors: ${this.stats.errors.length}`);
                
                if (this.stats.errors.length > 0) {
                    console.log('\n🚨 ERRORS:');
                    this.stats.errors.forEach((error, i) => {
                        console.log(`${i+1}. ${error.type}: ${error.error}`);
                    });
                }
                
                if (validationPassed) {
                    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
                    console.log('✅ Data is now in Supabase');
                    console.log('📋 Next: Update authentication to use Supabase');
                } else {
                    console.log('\n⚠️  MIGRATION COMPLETED WITH ISSUES');
                    console.log('❌ Please review and retry if needed');
                }
                
            } catch (error) {
                console.error('❌ Migration failed:', error.message);
            }
        }, 2000); // Wait for DB initialization
    }
}

// Run migration
const migration = new SupabaseMigration();
migration.run(); 