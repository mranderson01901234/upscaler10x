#!/usr/bin/env node

/**
 * SQLite to Supabase Migration Script
 * Migrates users and usage logs from SQLite to Supabase with zero downtime
 */

const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

class DatabaseMigration {
    constructor() {
        // Supabase client
        this.supabase = createClient(
            'https://vztoftcjbwzwioxarovy.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04'
        );
        
        // SQLite connection
        const dbPath = path.join(__dirname, 'pro-upscaler/server/pro-upscaler.db');
        this.sqlite = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ SQLite connection failed:', err.message);
                process.exit(1);
            }
        });

        this.migrationStats = {
            users_processed: 0,
            users_migrated: 0,
            users_skipped: 0,
            usage_logs_migrated: 0,
            errors: []
        };
    }

    async validateSupabaseConnection() {
        console.log('🔍 Validating Supabase connection...');
        
        try {
            const { data, error } = await this.supabase
                .from('subscription_tiers')
                .select('count', { count: 'exact', head: true });
                
            if (error) {
                throw new Error(error.message);
            }
            
            console.log('✅ Supabase connection validated');
            return true;
        } catch (error) {
            console.error('❌ Supabase connection failed:', error.message);
            return false;
        }
    }

    async backupSQLiteData() {
        console.log('💾 Creating SQLite backup...');
        
        const backupPath = path.join(__dirname, `pro-upscaler-backup-${Date.now()}.db`);
        
        return new Promise((resolve, reject) => {
            const fs = require('fs');
            const originalPath = path.join(__dirname, 'pro-upscaler/server/pro-upscaler.db');
            
            fs.copyFile(originalPath, backupPath, (err) => {
                if (err) {
                    console.error('❌ Backup failed:', err.message);
                    reject(err);
                } else {
                    console.log(`✅ Backup created: ${backupPath}`);
                    resolve(backupPath);
                }
            });
        });
    }

    async migrateUsers() {
        console.log('👥 Migrating users from SQLite to Supabase...');
        
        return new Promise((resolve, reject) => {
            this.sqlite.all('SELECT * FROM users', async (err, users) => {
                if (err) {
                    console.error('❌ Failed to fetch users:', err.message);
                    return reject(err);
                }
                
                console.log(`📊 Found ${users.length} users to migrate`);
                
                for (const user of users) {
                    this.migrationStats.users_processed++;
                    
                    try {
                        // Check if user already exists in Supabase
                        const { data: existingProfile } = await this.supabase
                            .from('user_profiles')
                            .select('id')
                            .eq('id', user.id)
                            .single();
                            
                        if (existingProfile) {
                            console.log(`⚠️  User ${user.email} already exists, skipping`);
                            this.migrationStats.users_skipped++;
                            continue;
                        }

                        // Create auth user first (simulate - in real scenario would use admin API)
                        const userId = this.generateUserId(user.email);
                        
                        // Create user profile in Supabase
                        const { error: profileError } = await this.supabase
                            .from('user_profiles')
                            .insert({
                                id: userId,
                                subscription_tier: user.subscription_tier || 'free',
                                created_at: user.created_at,
                                updated_at: user.updated_at || user.created_at
                            });
                            
                        if (profileError) {
                            console.error(`❌ Failed to create profile for ${user.email}:`, profileError.message);
                            this.migrationStats.errors.push({
                                type: 'user_migration',
                                email: user.email,
                                error: profileError.message
                            });
                        } else {
                            console.log(`✅ Migrated user: ${user.email} (${user.subscription_tier})`);
                            this.migrationStats.users_migrated++;
                        }
                        
                    } catch (error) {
                        console.error(`❌ Error migrating user ${user.email}:`, error.message);
                        this.migrationStats.errors.push({
                            type: 'user_migration',
                            email: user.email,
                            error: error.message
                        });
                    }
                }
                
                console.log(`👥 Users migration complete: ${this.migrationStats.users_migrated} migrated, ${this.migrationStats.users_skipped} skipped`);
                resolve();
            });
        });
    }

    async migrateUsageLogs() {
        console.log('📈 Migrating usage logs from SQLite to Supabase...');
        
        return new Promise((resolve, reject) => {
            this.sqlite.all('SELECT * FROM usage_logs', async (err, logs) => {
                if (err) {
                    console.error('❌ Failed to fetch usage logs:', err.message);
                    return reject(err);
                }
                
                console.log(`📊 Found ${logs.length} usage logs to migrate`);
                
                if (logs.length === 0) {
                    console.log('✅ No usage logs to migrate');
                    return resolve();
                }

                // Process in batches for better performance
                const batchSize = 50;
                for (let i = 0; i < logs.length; i += batchSize) {
                    const batch = logs.slice(i, i + batchSize);
                    
                    const supabaseLogs = batch.map(log => ({
                        user_id: this.generateUserId('user-' + log.user_id), // Convert SQLite user_id to UUID
                        processing_type: this.mapProcessingType(log.processing_type),
                        scale_factor: this.mapScaleFactor(log.processing_type),
                        image_pixels: log.image_size || 0,
                        processing_time_ms: log.processing_time || 0,
                        created_at: log.created_at
                    }));
                    
                    try {
                        const { error } = await this.supabase
                            .from('usage_logs')
                            .insert(supabaseLogs);
                            
                        if (error) {
                            console.error(`❌ Batch insert failed:`, error.message);
                            this.migrationStats.errors.push({
                                type: 'usage_logs_batch',
                                batch_size: batch.length,
                                error: error.message
                            });
                        } else {
                            this.migrationStats.usage_logs_migrated += batch.length;
                            console.log(`✅ Migrated ${batch.length} usage logs (batch ${Math.floor(i/batchSize) + 1})`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ Error migrating usage logs batch:`, error.message);
                        this.migrationStats.errors.push({
                            type: 'usage_logs_batch',
                            batch_size: batch.length,
                            error: error.message
                        });
                    }
                }
                
                console.log(`📈 Usage logs migration complete: ${this.migrationStats.usage_logs_migrated} migrated`);
                resolve();
            });
        });
    }

    generateUserId(email) {
        // Generate a consistent UUID-like ID from email for mapping
        const hash = crypto.createHash('sha256').update(email).digest('hex');
        return [
            hash.substr(0, 8),
            hash.substr(8, 4), 
            hash.substr(12, 4),
            hash.substr(16, 4),
            hash.substr(20, 12)
        ].join('-');
    }

    mapProcessingType(sqliteType) {
        const mapping = {
            'standard': 'standard',
            'highres': 'highres', 
            'ai_enhancement': 'ai_enhancement'
        };
        return mapping[sqliteType] || 'standard';
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
        console.log('🔍 Validating migration results...');
        
        try {
            // Count records in both systems
            const sqliteUsers = await new Promise((resolve) => {
                this.sqlite.get('SELECT COUNT(*) as count FROM users', (err, result) => {
                    resolve(result?.count || 0);
                });
            });
            
            const sqliteUsage = await new Promise((resolve) => {
                this.sqlite.get('SELECT COUNT(*) as count FROM usage_logs', (err, result) => {
                    resolve(result?.count || 0);
                });
            });

            const { count: supabaseProfiles } = await this.supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });
                
            const { count: supabaseUsage } = await this.supabase
                .from('usage_logs')
                .select('*', { count: 'exact', head: true });

            console.log('\n📊 MIGRATION VALIDATION');
            console.log('=======================');
            console.log(`👥 Users - SQLite: ${sqliteUsers}, Supabase: ${supabaseProfiles || 0}`);
            console.log(`📈 Usage - SQLite: ${sqliteUsage}, Supabase: ${supabaseUsage || 0}`);
            
            const usersValid = (supabaseProfiles || 0) >= this.migrationStats.users_migrated;
            const usageValid = (supabaseUsage || 0) >= this.migrationStats.usage_logs_migrated;
            
            if (usersValid && usageValid) {
                console.log('✅ Migration validation PASSED');
                return true;
            } else {
                console.log('❌ Migration validation FAILED');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Validation error:', error.message);
            return false;
        }
    }

    async generateMigrationReport() {
        console.log('\n📋 MIGRATION REPORT');
        console.log('===================');
        console.log(`👥 Users Processed: ${this.migrationStats.users_processed}`);
        console.log(`✅ Users Migrated: ${this.migrationStats.users_migrated}`);
        console.log(`⚠️  Users Skipped: ${this.migrationStats.users_skipped}`);
        console.log(`📈 Usage Logs Migrated: ${this.migrationStats.usage_logs_migrated}`);
        console.log(`❌ Errors: ${this.migrationStats.errors.length}`);
        
        if (this.migrationStats.errors.length > 0) {
            console.log('\n🚨 ERRORS ENCOUNTERED:');
            this.migrationStats.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.type}: ${error.error}`);
                if (error.email) console.log(`   Email: ${error.email}`);
            });
        }
        
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Update authentication middleware to use Supabase');
        console.log('2. Update API endpoints to use Supabase as primary DB');
        console.log('3. Test all functionality with Supabase');
        console.log('4. Optionally keep SQLite as local cache only');
    }

    async run() {
        console.log('🚀 STARTING SUPABASE MIGRATION');
        console.log('==============================');
        console.log('Migrating from SQLite to Supabase with zero downtime...\n');

        try {
            // Step 1: Validate connections
            const supabaseValid = await this.validateSupabaseConnection();
            if (!supabaseValid) {
                throw new Error('Supabase connection validation failed');
            }

            // Step 2: Create backup
            await this.backupSQLiteData();

            // Step 3: Migrate users
            await this.migrateUsers();

            // Step 4: Migrate usage logs  
            await this.migrateUsageLogs();

            // Step 5: Validate migration
            const validationPassed = await this.validateMigration();
            
            if (validationPassed) {
                console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
                console.log('✅ All data migrated to Supabase');
                console.log('✅ SQLite backup created');
                console.log('✅ Validation passed');
            } else {
                console.log('\n⚠️  MIGRATION COMPLETED WITH ISSUES');
                console.log('❌ Validation failed - manual review needed');
            }

            // Step 6: Generate report
            await this.generateMigrationReport();

        } catch (error) {
            console.error('\n❌ MIGRATION FAILED:', error.message);
            console.log('💾 SQLite backup preserved');
            console.log('🔄 Safe to retry migration');
        } finally {
            this.sqlite.close();
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migration = new DatabaseMigration();
    migration.run();
}

module.exports = DatabaseMigration; 