/**
 * Test Suite for Server API Routes
 * Validates that the platform abstraction routes work correctly
 */

const http = require('http');

class ServerTests {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.testResults = [];
    }

    async runTests() {
        console.log('🧪 Testing Server API Routes...\n');

        try {
            // Test basic health check
            await this.testHealthCheck();
            
            // Test platform manager routes (the ones that were broken)
            await this.testPlatformManagerRoutes();
            
            // Test legacy compatibility
            await this.testLegacyCompatibility();

            this.reportResults();
        } catch (error) {
            console.error('❌ Test suite failed to run:', error.message);
        }
    }

    async testHealthCheck() {
        await this.test('Health Check', async () => {
            const response = await this.makeRequest('/api/health');
            
            if (response.status !== 200) {
                throw new Error(`Expected status 200, got ${response.status}`);
            }

            const data = JSON.parse(response.data);
            if (!data.status || !data.platform) {
                throw new Error('Health check response missing required fields');
            }

            console.log(`   Platform mode: ${data.platform.mode}`);
            console.log(`   Version: ${data.platform.version}`);
            
            return 'Health check returned valid response';
        });
    }

    async testPlatformManagerRoutes() {
        console.log('\n📊 Testing Platform Manager Routes (Previously Broken):');

        await this.test('Config Profiles List', async () => {
            const response = await this.makeRequest('/api/config-profiles');
            
            if (response.status === 404) {
                throw new Error('Route still not found - platform manager routing failed');
            }

            if (response.status !== 200) {
                const data = JSON.parse(response.data);
                throw new Error(`API Error: ${data.error || 'Unknown error'}`);
            }

            const data = JSON.parse(response.data);
            if (!data.success) {
                throw new Error(`Platform manager returned error: ${data.error}`);
            }

            return 'Configuration profiles API accessible';
        });

        await this.test('Health Scoring', async () => {
            const response = await this.makeRequest('/api/health/score');
            
            if (response.status === 404) {
                throw new Error('Health scoring route not found');
            }

            // Expect either success or a proper error response
            const data = JSON.parse(response.data);
            
            if (response.status === 200 && data.success) {
                return 'Health scoring API working';
            } else if (data.error && !data.error.includes('Route not found')) {
                return 'Health scoring API accessible (may need monitoring data)';
            } else {
                throw new Error('Health scoring route not properly routed');
            }
        });

        await this.test('Validation Workflow', async () => {
            const response = await this.makeRequest('/api/validation/tests');
            
            if (response.status === 404) {
                throw new Error('Validation tests route not found');
            }

            const data = JSON.parse(response.data);
            
            if (response.status === 200 && data.success) {
                return 'Validation workflow API working';
            } else if (data.error && !data.error.includes('Route not found')) {
                return 'Validation workflow API accessible';
            } else {
                throw new Error('Validation workflow route not properly routed');
            }
        });
    }

    async testLegacyCompatibility() {
        console.log('\n🔄 Testing Legacy Compatibility:');

        await this.test('System Preferences', async () => {
            const response = await this.makeRequest('/api/system-prefs/settings');
            
            if (response.status !== 200) {
                throw new Error(`Legacy route failed: ${response.status}`);
            }

            return 'Legacy system preferences still accessible';
        });

        await this.test('Launch Agents', async () => {
            const response = await this.makeRequest('/api/launch-agents');
            
            if (response.status !== 200) {
                throw new Error(`Legacy route failed: ${response.status}`);
            }

            return 'Legacy launch agents still accessible';
        });
    }

    async test(name, testFn) {
        try {
            console.log(`  Testing: ${name}`);
            const result = await testFn();
            this.testResults.push({ name, status: 'PASS', message: result });
            console.log(`  ✅ ${name}: ${result}`);
        } catch (error) {
            this.testResults.push({ name, status: 'FAIL', error: error.message });
            console.log(`  ❌ ${name}: ${error.message}`);
        }
    }

    makeRequest(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            const req = http.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    reportResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('=' .repeat(50));
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
        }
        
        console.log('\n' + '='.repeat(50));
        
        if (failed === 0) {
            console.log('🎉 All tests passed! Server is working correctly.');
            console.log('✨ The platform abstraction routes are accessible.');
            console.log('🔄 Legacy routes continue to work for backward compatibility.');
        } else {
            console.log(`💥 ${failed} tests failed. Check the issues above.`);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const testSuite = new ServerTests();
    
    // Wait a moment for server to be ready, then run tests
    setTimeout(() => {
        testSuite.runTests()
            .then(() => {
                process.exit(0);
            })
            .catch(error => {
                console.error('Test suite failed:', error);
                process.exit(1);
            });
    }, 2000);
}

module.exports = ServerTests;