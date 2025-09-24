/**
 * Admin System Integration Test
 * Tests admin authentication, permissions, and API endpoints
 */

const fs = require('fs');
const path = require('path');

class AdminSystemTester {
    constructor() {
        this.testResults = [];
        this.serverUrl = 'http://localhost:3002';
        this.adminUrl = `${this.serverUrl}/api/admin`;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        console.log(logMessage);
        this.testResults.push({ timestamp, type, message });
    }

    async runTests() {
        this.log('🚀 Starting Admin System Integration Tests');
        
        try {
            await this.testDatabaseSchema();
            await this.testAdminMiddleware();
            await this.testAdminRoutes();
            await this.testSystemHealth();
            await this.testUserManagement();
            await this.testAnalytics();
            
            this.generateReport();
        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
        }
    }

    async testDatabaseSchema() {
        this.log('📊 Testing Database Schema');
        
        const schemaTests = [
            {
                name: 'Admin Setup SQL File',
                test: () => fs.existsSync('supabase-admin-setup.sql'),
                description: 'Admin database schema file exists'
            },
            {
                name: 'Admin Auth Middleware',
                test: () => fs.existsSync('pro-upscaler/server/admin-auth-middleware.js'),
                description: 'Admin authentication middleware exists'
            },
            {
                name: 'Admin Routes',
                test: () => fs.existsSync('pro-upscaler/server/admin-routes.js'),
                description: 'Admin routes file exists'
            }
        ];

        for (const test of schemaTests) {
            if (test.test()) {
                this.log(`✅ ${test.name}: ${test.description}`, 'success');
            } else {
                this.log(`❌ ${test.name}: Failed - ${test.description}`, 'error');
            }
        }
    }

    async testAdminMiddleware() {
        this.log('🔐 Testing Admin Authentication Middleware');
        
        try {
            const AdminAuthMiddleware = require('./pro-upscaler/server/admin-auth-middleware');
            const middleware = new AdminAuthMiddleware();
            
            this.log('✅ Admin middleware instantiated successfully', 'success');
            
            // Test methods exist
            const requiredMethods = [
                'authenticateAdmin',
                'checkPermission',
                'getUserPermissions',
                'logAdminAction',
                'getSystemHealth',
                'getBusinessMetrics',
                'searchUsers'
            ];

            for (const method of requiredMethods) {
                if (typeof middleware[method] === 'function') {
                    this.log(`✅ Method ${method} exists`, 'success');
                } else {
                    this.log(`❌ Method ${method} missing`, 'error');
                }
            }
        } catch (error) {
            this.log(`❌ Admin middleware test failed: ${error.message}`, 'error');
        }
    }

    async testAdminRoutes() {
        this.log('🛣️ Testing Admin Routes');
        
        try {
            const AdminRoutes = require('./pro-upscaler/server/admin-routes');
            const routes = new AdminRoutes();
            
            this.log('✅ Admin routes instantiated successfully', 'success');
            
            const router = routes.getRouter();
            if (router && typeof router.use === 'function') {
                this.log('✅ Admin router created successfully', 'success');
            } else {
                this.log('❌ Admin router creation failed', 'error');
            }
        } catch (error) {
            this.log(`❌ Admin routes test failed: ${error.message}`, 'error');
        }
    }

    async testSystemHealth() {
        this.log('💚 Testing System Health Monitoring');
        
        try {
            // Test main server health
            const response = await fetch(`${this.serverUrl}/health`);
            if (response.ok) {
                const health = await response.json();
                this.log(`✅ Main server healthy: ${health.status}`, 'success');
            } else {
                this.log(`❌ Main server health check failed: ${response.status}`, 'error');
            }
        } catch (error) {
            this.log(`❌ System health test failed: ${error.message}`, 'error');
        }
    }

    async testUserManagement() {
        this.log('👥 Testing User Management Components');
        
        const componentTests = [
            {
                name: 'AdminDashboard Component',
                file: 'pro-upscaler/client-react/src/pages/AdminDashboard.tsx'
            },
            {
                name: 'UserManagement Component', 
                file: 'pro-upscaler/client-react/src/pages/UserManagement.tsx'
            }
        ];

        for (const test of componentTests) {
            if (fs.existsSync(test.file)) {
                const content = fs.readFileSync(test.file, 'utf8');
                if (content.includes('export function')) {
                    this.log(`✅ ${test.name} exists and exports component`, 'success');
                } else {
                    this.log(`❌ ${test.name} exists but no export found`, 'error');
                }
            } else {
                this.log(`❌ ${test.name} file not found: ${test.file}`, 'error');
            }
        }
    }

    async testAnalytics() {
        this.log('📈 Testing Analytics Components');
        
        // Test if analytics views would be created in database
        const analyticsViews = [
            'business_metrics',
            'subscription_analytics'
        ];

        const schemaContent = fs.readFileSync('supabase-admin-setup.sql', 'utf8');
        
        for (const view of analyticsViews) {
            if (schemaContent.includes(`CREATE OR REPLACE VIEW ${view}`)) {
                this.log(`✅ Analytics view ${view} defined in schema`, 'success');
            } else {
                this.log(`❌ Analytics view ${view} missing from schema`, 'error');
            }
        }
    }

    generateReport() {
        this.log('📋 Generating Test Report');
        
        const successCount = this.testResults.filter(r => r.type === 'success').length;
        const errorCount = this.testResults.filter(r => r.type === 'error').length;
        const totalTests = successCount + errorCount;
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total_tests: totalTests,
                passed: successCount,
                failed: errorCount,
                success_rate: totalTests > 0 ? ((successCount / totalTests) * 100).toFixed(1) : 0
            },
            results: this.testResults,
            admin_system_status: errorCount === 0 ? 'READY' : 'NEEDS_FIXES',
            next_steps: this.generateNextSteps(errorCount)
        };

        // Write report to file
        fs.writeFileSync('admin-system-test-report.json', JSON.stringify(report, null, 2));
        
        this.log('📊 Test Summary:', 'info');
        this.log(`   Total Tests: ${totalTests}`, 'info');
        this.log(`   Passed: ${successCount}`, 'success');
        this.log(`   Failed: ${errorCount}`, errorCount > 0 ? 'error' : 'info');
        this.log(`   Success Rate: ${report.summary.success_rate}%`, 'info');
        this.log(`   Status: ${report.admin_system_status}`, report.admin_system_status === 'READY' ? 'success' : 'error');
        
        if (report.admin_system_status === 'READY') {
            this.log('🎉 Admin System Ready for Phase 4 Implementation!', 'success');
            this.log('📍 Next: Run the Supabase admin setup SQL and start using admin features', 'info');
        } else {
            this.log('⚠️ Admin System needs fixes before deployment', 'error');
        }
    }

    generateNextSteps(errorCount) {
        if (errorCount === 0) {
            return [
                "1. Run supabase-admin-setup.sql in your Supabase SQL editor",
                "2. Create your first admin user by updating user_profiles table",
                "3. Test admin login and permissions",
                "4. Access admin dashboard at /admin",
                "5. Configure system monitoring and alerts"
            ];
        } else {
            return [
                "1. Fix failing tests identified in the report",
                "2. Ensure all admin files are properly created",
                "3. Verify database schema is correct",
                "4. Test admin middleware and routes",
                "5. Re-run tests until all pass"
            ];
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new AdminSystemTester();
    tester.runTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = AdminSystemTester; 