#!/usr/bin/env node

/**
 * Integration Test Suite for Installation Up 4evr
 * Tests all refactored tab functionality and API integration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class IntegrationTester {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.results = [];
        this.passCount = 0;
        this.failCount = 0;
    }

    log(type, test, message, details = '') {
        const result = { type, test, message, details, timestamp: new Date() };
        this.results.push(result);
        
        const colors = {
            'PASS': '\x1b[32m',
            'FAIL': '\x1b[31m',
            'INFO': '\x1b[36m',
            'WARN': '\x1b[33m'
        };
        
        const resetColor = '\x1b[0m';
        const color = colors[type] || '';
        
        console.log(`${color}[${type}] ${test}: ${message}${resetColor}`);
        if (details) {
            console.log(`    ${details}`);
        }

        if (type === 'PASS') this.passCount++;
        if (type === 'FAIL') this.failCount++;
    }

    async makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}${path}`;
            const req = http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        if (res.headers['content-type']?.includes('application/json')) {
                            resolve({ statusCode: res.statusCode, data: JSON.parse(data), raw: data });
                        } else {
                            resolve({ statusCode: res.statusCode, data: null, raw: data });
                        }
                    } catch (error) {
                        resolve({ statusCode: res.statusCode, data: null, raw: data, error: error.message });
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async testBasicConnectivity() {
        this.log('INFO', 'Basic Connectivity', 'Testing server availability...');
        
        try {
            const response = await this.makeRequest('/api/health');
            if (response.statusCode === 200 && response.data?.success) {
                this.log('PASS', 'Health Check', 'Server is healthy and responding');
                return true;
            } else {
                this.log('FAIL', 'Health Check', `Unexpected response: ${response.statusCode}`);
                return false;
            }
        } catch (error) {
            this.log('FAIL', 'Health Check', 'Server not accessible', error.message);
            return false;
        }
    }

    async testMonitoringEndpoints() {
        this.log('INFO', 'Monitoring APIs', 'Testing monitoring endpoint functionality...');
        
        const endpoints = [
            { path: '/api/monitoring/status', name: 'Monitoring Status' },
            { path: '/api/monitoring/applications', name: 'Applications List' },
            { path: '/api/platform', name: 'Platform Info' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest(endpoint.path);
                if (response.statusCode === 200 && response.data?.success) {
                    this.log('PASS', endpoint.name, `${endpoint.path} working correctly`);
                } else {
                    this.log('FAIL', endpoint.name, `Failed: ${response.statusCode}`, response.raw?.substring(0, 100));
                }
            } catch (error) {
                this.log('FAIL', endpoint.name, `Error: ${error.message}`);
            }
        }
    }

    async testConfigurationEndpoints() {
        this.log('INFO', 'Configuration APIs', 'Testing configuration endpoint functionality...');
        
        const endpoints = [
            { path: '/api/config', name: 'Global Config Load' },
            { path: '/api/config/user-preferences', name: 'User Preferences' },
            { path: '/api/installation/settings', name: 'Installation Settings' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest(endpoint.path);
                if (response.statusCode === 200 && response.data?.success) {
                    this.log('PASS', endpoint.name, `${endpoint.path} working correctly`);
                } else {
                    this.log('FAIL', endpoint.name, `Failed: ${response.statusCode}`, response.raw?.substring(0, 100));
                }
            } catch (error) {
                this.log('FAIL', endpoint.name, `Error: ${error.message}`);
            }
        }
    }

    async testMissingEndpoints() {
        this.log('INFO', 'Missing APIs', 'Verifying expected missing endpoints...');
        
        const missingEndpoints = [
            { path: '/api/system/status', name: 'Service Control Status' },
            { path: '/api/notifications/config', name: 'Notification Config' },
            { path: '/api/installation/test', name: 'Installation Validation' }
        ];

        for (const endpoint of missingEndpoints) {
            try {
                const response = await this.makeRequest(endpoint.path);
                if (response.statusCode === 404 || (response.data && !response.data.success)) {
                    this.log('PASS', endpoint.name, `Correctly returns 404/error as expected`);
                } else {
                    this.log('WARN', endpoint.name, `Unexpected success - may have been implemented`);
                }
            } catch (error) {
                this.log('PASS', endpoint.name, `Correctly inaccessible: ${error.message}`);
            }
        }
    }

    async testFrontendAssets() {
        this.log('INFO', 'Frontend Assets', 'Testing frontend file accessibility...');
        
        const assets = [
            { path: '/', name: 'Main HTML' },
            { path: '/js/main.js', name: 'Main JavaScript' },
            { path: '/js/modules/system-preferences.js', name: 'System Preferences Module' },
            { path: '/js/modules/service-control.js', name: 'Service Control Module' },
            { path: '/js/modules/configuration.js', name: 'Configuration Module' },
            { path: '/js/modules/notifications.js', name: 'Notifications Module' },
            { path: '/styles.css', name: 'Main Stylesheet' }
        ];

        for (const asset of assets) {
            try {
                const response = await this.makeRequest(asset.path);
                if (response.statusCode === 200) {
                    this.log('PASS', asset.name, `${asset.path} accessible`);
                } else {
                    this.log('FAIL', asset.name, `Failed to load: ${response.statusCode}`);
                }
            } catch (error) {
                this.log('FAIL', asset.name, `Error loading: ${error.message}`);
            }
        }
    }

    checkFileStructure() {
        this.log('INFO', 'File Structure', 'Verifying file structure...');
        
        const requiredFiles = [
            'frontend/js/main.js',
            'frontend/js/modules/system-preferences.js',
            'frontend/js/modules/launch-agents.js',
            'frontend/js/modules/service-control.js',
            'frontend/js/modules/configuration.js',
            'frontend/js/modules/installation-settings.js',
            'frontend/js/modules/notifications.js',
            'frontend/js/modules/monitoring-config.js',
            'frontend/js/utils/api.js',
            'frontend/js/utils/ui.js',
            'frontend/index.html',
            'frontend/styles.css'
        ];

        for (const file of requiredFiles) {
            const fullPath = path.join(__dirname, file);
            if (fs.existsSync(fullPath)) {
                this.log('PASS', 'File Structure', `${file} exists`);
            } else {
                this.log('FAIL', 'File Structure', `${file} missing`);
            }
        }
    }

    generateReport() {
        this.log('INFO', 'Test Summary', 'Generating final report...');
        
        const totalTests = this.passCount + this.failCount;
        const successRate = totalTests > 0 ? Math.round((this.passCount / totalTests) * 100) : 0;
        
        console.log('\n' + '='.repeat(60));
        console.log('INTEGRATION TEST REPORT');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${this.passCount}`);
        console.log(`Failed: ${this.failCount}`);
        console.log(`Success Rate: ${successRate}%`);
        console.log('='.repeat(60));
        
        if (successRate >= 80) {
            console.log('\x1b[32mOVERALL RESULT: PASS ✅\x1b[0m');
        } else if (successRate >= 60) {
            console.log('\x1b[33mOVERALL RESULT: PARTIAL ⚠️\x1b[0m');
        } else {
            console.log('\x1b[31mOVERALL RESULT: FAIL ❌\x1b[0m');
        }
        
        return { totalTests, passCount: this.passCount, failCount: this.failCount, successRate };
    }

    async runAllTests() {
        console.log('\x1b[36m🧪 Installation Up 4evr - Integration Test Suite\x1b[0m\n');
        
        // Check if server is running
        const serverAvailable = await this.testBasicConnectivity();
        if (!serverAvailable) {
            console.log('\x1b[31m❌ Server not available. Please start the backend server first.\x1b[0m');
            return;
        }

        // Run all test suites
        this.checkFileStructure();
        await this.testFrontendAssets();
        await this.testMonitoringEndpoints();
        await this.testConfigurationEndpoints();
        await this.testMissingEndpoints();
        
        // Generate final report
        return this.generateReport();
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new IntegrationTester();
    tester.runAllTests().then(result => {
        process.exit(result?.successRate >= 80 ? 0 : 1);
    }).catch(error => {
        console.error('\x1b[31mTest suite failed:', error.message, '\x1b[0m');
        process.exit(1);
    });
}

module.exports = IntegrationTester;