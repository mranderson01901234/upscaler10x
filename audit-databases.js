#!/usr/bin/env node

/**
 * Database Audit Script
 * Analyzes current data in both SQLite and Supabase databases
 */

const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseAudit {
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
                console.log('SQLite connection failed:', err.message);
            }
        });
    }

    async auditSQLite() {
        console.log('\n🗄️  SQLITE DATABASE AUDIT');
        console.log('========================');

        return new Promise((resolve) => {
            const results = {};

            // Check users table
            this.sqlite.all('SELECT COUNT(*) as count FROM users', (err, result) => {
                if (err) {
                    results.users_error = err.message;
                } else {
                    results.users_count = result[0].count;
                    
                    // Get sample users
                    this.sqlite.all('SELECT id, email, subscription_tier, created_at FROM users LIMIT 5', (err, users) => {
                        if (!err) {
                            results.sample_users = users;
                        }
                        
                        // Check usage logs
                        this.sqlite.all('SELECT COUNT(*) as count FROM usage_logs', (err, result) => {
                            if (err) {
                                results.usage_error = err.message;
                            } else {
                                results.usage_count = result[0].count;
                            }
                            
                            // Check subscription tiers
                            this.sqlite.all('SELECT * FROM subscription_tiers', (err, tiers) => {
                                if (!err) {
                                    results.subscription_tiers = tiers;
                                }
                                
                                // Display results
                                console.log('📊 Users:', results.users_count || 'Error: ' + results.users_error);
                                console.log('📈 Usage Logs:', results.usage_count || 'Error: ' + results.usage_error);
                                console.log('💰 Subscription Tiers:', results.subscription_tiers ? results.subscription_tiers.length : 'Not found');
                                
                                if (results.sample_users && results.sample_users.length > 0) {
                                    console.log('👤 Sample Users:');
                                    results.sample_users.forEach(user => {
                                        console.log(`   - ${user.email} (${user.subscription_tier}) - ${user.created_at}`);
                                    });
                                }
                                
                                if (results.subscription_tiers) {
                                    console.log('💳 Tiers Available:');
                                    results.subscription_tiers.forEach(tier => {
                                        console.log(`   - ${tier.tier_name}: $${tier.price_monthly}/month`);
                                    });
                                }
                                
                                resolve(results);
                            });
                        });
                    });
                }
            });
        });
    }

    async auditSupabase() {
        console.log('\n☁️  SUPABASE DATABASE AUDIT');
        console.log('==========================');

        try {
            // Check user profiles
            const { count: profilesCount } = await this.supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });

            console.log('👥 User Profiles:', profilesCount || 0);

            // Get sample profiles
            const { data: sampleProfiles } = await this.supabase
                .from('user_profiles')
                .select('id, subscription_tier, created_at')
                .limit(5);

            if (sampleProfiles && sampleProfiles.length > 0) {
                console.log('👤 Sample Profiles:');
                sampleProfiles.forEach(profile => {
                    console.log(`   - ${profile.id} (${profile.subscription_tier}) - ${profile.created_at}`);
                });
            }

            // Check usage logs
            const { count: usageCount } = await this.supabase
                .from('usage_logs')
                .select('*', { count: 'exact', head: true });

            console.log('📈 Usage Logs:', usageCount || 0);

            // Check subscription tiers
            const { data: supabaseTiers } = await this.supabase
                .from('subscription_tiers')
                .select('*');

            if (supabaseTiers) {
                console.log('💳 Subscription Tiers:', supabaseTiers.length);
                supabaseTiers.forEach(tier => {
                    console.log(`   - ${tier.tier_name}: $${tier.price_monthly}/month (2x4x: ${tier.max_2x_4x}, 8x: ${tier.max_8x}, AI: ${tier.max_ai_enhancements})`);
                });
            }

            return {
                profiles_count: profilesCount || 0,
                usage_count: usageCount || 0,
                tiers: supabaseTiers || [],
                sample_profiles: sampleProfiles || []
            };

        } catch (error) {
            console.error('❌ Supabase audit error:', error.message);
            return { error: error.message };
        }
    }

    async generateMigrationPlan(sqliteData, supabaseData) {
        console.log('\n📋 MIGRATION PLAN');
        console.log('=================');

        const plan = {
            users_to_migrate: sqliteData.users_count || 0,
            usage_logs_to_migrate: sqliteData.usage_count || 0,
            existing_supabase_profiles: supabaseData.profiles_count || 0,
            conflicts_possible: false,
            migration_strategy: 'append', // or 'merge' or 'replace'
            estimated_time: '5-10 minutes'
        };

        console.log(`📊 SQLite Users to Migrate: ${plan.users_to_migrate}`);
        console.log(`📊 SQLite Usage Logs to Migrate: ${plan.usage_logs_to_migrate}`);
        console.log(`☁️  Existing Supabase Profiles: ${plan.existing_supabase_profiles}`);

        if (plan.existing_supabase_profiles > 0 && plan.users_to_migrate > 0) {
            plan.conflicts_possible = true;
            plan.migration_strategy = 'merge_with_conflict_resolution';
            console.log('⚠️  Potential conflicts detected - will use merge strategy');
        } else if (plan.users_to_migrate === 0) {
            plan.migration_strategy = 'no_migration_needed';
            console.log('✅ No SQLite data to migrate');
        } else {
            console.log('✅ Clean migration - no conflicts expected');
        }

        console.log(`⏱️  Estimated Migration Time: ${plan.estimated_time}`);

        return plan;
    }

    async run() {
        console.log('🔍 COMPREHENSIVE DATABASE AUDIT');
        console.log('===============================');
        console.log('Analyzing both SQLite and Supabase databases...\n');

        try {
            const sqliteData = await this.auditSQLite();
            const supabaseData = await this.auditSupabase();
            const migrationPlan = await this.generateMigrationPlan(sqliteData, supabaseData);

            console.log('\n🎯 CONSOLIDATION READINESS');
            console.log('=========================');
            
            if (sqliteData.users_count > 0 || sqliteData.usage_count > 0) {
                console.log('✅ SQLite data found - migration scripts needed');
                console.log('📋 Next: Create migration scripts');
            } else {
                console.log('✅ No SQLite data - can proceed directly to Supabase-only mode');
                console.log('📋 Next: Update authentication middleware');
            }

            console.log('🔄 Database consolidation ready to begin!');

        } catch (error) {
            console.error('❌ Audit failed:', error);
        } finally {
            this.sqlite.close();
        }
    }
}

// Run the audit
if (require.main === module) {
    const audit = new DatabaseAudit();
    audit.run();
} 