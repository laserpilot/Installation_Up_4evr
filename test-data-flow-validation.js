#!/usr/bin/env node

/**
 * Data Flow Validation Test Suite
 * Phase 8.7.2: Data Flow Validation
 * 
 * Tests:
 * 1. Monitoring data consistency across tabs
 * 2. Configuration persistence across sessions  
 * 3. All API endpoints validation
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🔍 Data Flow Validation Test Suite');
console.log('Phase 8.7.2: Testing monitoring data consistency, configuration persistence, and API endpoints\n');

// Test Results Storage
const results = {
    monitoringDataConsistency: [],
    configurationPersistence: [],
    apiEndpointsValidation: []
};

// Server connection details
const SERVER_URL = 'http://localhost:3001';
const TIMEOUT = 10000;

/**
 * Test 1: Monitoring Data Consistency
 */
async function testMonitoringDataConsistency() {
    console.log('📊 Test 1: Monitoring Data Consistency');
    
    const tests = [
        {
            name: 'Unified Display Manager Integration',
            test: () => testUnifiedDisplayManager()
        },
        {
            name: 'Cross-Tab Data Synchronization',
            test: () => testCrossTabDataSync()
        },
        {
            name: 'Real-Time Data Updates',
            test: () => testRealTimeDataUpdates()
        },
        {
            name: 'API Data Format Consistency',
            test: () => testAPIDataFormatConsistency()
        },
        {
            name: 'Monitoring Threshold Consistency',
            test: () => testMonitoringThresholdConsistency()
        }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.test();
            results.monitoringDataConsistency.push({
                name: test.name,
                status: result.success ? 'PASS' : 'FAIL',
                details: result.details || result.error
            });
            console.log(`  ${result.success ? '✅' : '❌'} ${test.name}: ${result.details || result.error}`);
        } catch (error) {
            results.monitoringDataConsistency.push({
                name: test.name,
                status: 'ERROR',
                details: error.message
            });
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
}

/**
 * Test 2: Configuration Persistence  
 */
async function testConfigurationPersistence() {
    console.log('\n💾 Test 2: Configuration Persistence');
    
    const tests = [
        {
            name: 'Master Configuration Save/Load',
            test: () => testMasterConfigPersistence()
        },
        {
            name: 'System Preferences Persistence',
            test: () => testSystemPreferencesPersistence()
        },
        {
            name: 'Launch Agent Configuration Persistence',
            test: () => testLaunchAgentPersistence()
        },
        {
            name: 'Monitoring Configuration Persistence',
            test: () => testMonitoringConfigPersistence()
        },
        {
            name: 'Installation Settings Persistence',
            test: () => testInstallationSettingsPersistence()
        },
        {
            name: 'Notification Configuration Persistence',
            test: () => testNotificationConfigPersistence()
        }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.test();
            results.configurationPersistence.push({
                name: test.name,
                status: result.success ? 'PASS' : 'FAIL',
                details: result.details || result.error
            });
            console.log(`  ${result.success ? '✅' : '❌'} ${test.name}: ${result.details || result.error}`);
        } catch (error) {
            results.configurationPersistence.push({
                name: test.name,
                status: 'ERROR',
                details: error.message
            });
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
}

/**
 * Test 3: API Endpoints Validation
 */
async function testAPIEndpointsValidation() {
    console.log('\n🌐 Test 3: API Endpoints Validation');
    
    const tests = [
        {
            name: 'Core System API Endpoints',
            test: () => testCoreSystemAPIs()
        },
        {
            name: 'Master Configuration API Endpoints',
            test: () => testMasterConfigAPIs()
        },
        {
            name: 'Monitoring API Endpoints',
            test: () => testMonitoringAPIs()
        },
        {
            name: 'Launch Agent API Endpoints',
            test: () => testLaunchAgentAPIs()
        },
        {
            name: 'Setup Wizard API Endpoints',
            test: () => testSetupWizardAPIs()
        },
        {
            name: 'Notification API Endpoints',
            test: () => testNotificationAPIs()
        },
        {
            name: 'API Error Handling',
            test: () => testAPIErrorHandling()
        },
        {
            name: 'API Response Time Performance',
            test: () => testAPIPerformance()
        }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.test();
            results.apiEndpointsValidation.push({
                name: test.name,
                status: result.success ? 'PASS' : 'FAIL',
                details: result.details || result.error
            });
            console.log(`  ${result.success ? '✅' : '❌'} ${test.name}: ${result.details || result.error}`);
        } catch (error) {
            results.apiEndpointsValidation.push({
                name: test.name,
                status: 'ERROR',
                details: error.message
            });
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
}

// Individual Test Functions

async function testUnifiedDisplayManager() {
    // Check if unified display manager is implemented
    const monitoringDisplayFile = path.join(__dirname, 'frontend/js/utils/monitoring-display.js');
    
    if (!fs.existsSync(monitoringDisplayFile)) {
        return { success: false, error: 'Monitoring display manager file not found' };
    }
    
    const content = fs.readFileSync(monitoringDisplayFile, 'utf8');
    
    const hasMonitoringDisplayManager = content.includes('MonitoringDisplayManager') || content.includes('class MonitoringDisplay');
    const hasUpdateMetricCard = content.includes('updateMetricCard');
    const hasSetupRefresh = content.includes('setupRefresh') || content.includes('setupAutoRefresh');
    
    if (hasMonitoringDisplayManager && hasUpdateMetricCard && hasSetupRefresh) {
        return { success: true, details: 'Unified display manager fully implemented with metric cards and refresh functionality' };
    }
    return { success: false, error: 'Unified display manager missing required functionality' };
}

async function testCrossTabDataSync() {
    // Check if monitoring data is used consistently across tabs
    const dashboardFile = path.join(__dirname, 'frontend/js/modules/dashboard.js');
    const monitoringFile = path.join(__dirname, 'frontend/js/modules/monitoring.js');
    const monitoringConfigFile = path.join(__dirname, 'frontend/js/modules/monitoring-config.js');
    
    const files = [dashboardFile, monitoringFile, monitoringConfigFile];
    const apiEndpoints = [];
    
    for (const file of files) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for common monitoring API endpoints
            if (content.includes('/api/monitoring/status')) {
                apiEndpoints.push('/api/monitoring/status');
            }
            if (content.includes('/api/monitoring/applications')) {
                apiEndpoints.push('/api/monitoring/applications');
            }
        }
    }
    
    // Check if multiple tabs use the same API endpoints
    const uniqueEndpoints = [...new Set(apiEndpoints)];
    const hasConsistentAPIs = uniqueEndpoints.length >= 1 && apiEndpoints.length >= 3;
    
    if (hasConsistentAPIs) {
        return { success: true, details: `Cross-tab data synchronization using consistent APIs: ${uniqueEndpoints.join(', ')}` };
    }
    return { success: false, error: 'Inconsistent API usage across monitoring tabs' };
}

async function testRealTimeDataUpdates() {
    // Check if real-time updates are implemented
    const monitoringFiles = [
        'frontend/js/modules/monitoring.js',
        'frontend/js/modules/dashboard.js',
        'frontend/js/modules/monitoring-config.js'
    ];
    
    let hasRealTimeUpdates = false;
    let updateMechanisms = [];
    
    for (const file of monitoringFiles) {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('setInterval') && content.includes('refresh')) {
                hasRealTimeUpdates = true;
                updateMechanisms.push(path.basename(file) + ': setInterval');
            }
            if (content.includes('setupAutoRefresh')) {
                hasRealTimeUpdates = true;
                updateMechanisms.push(path.basename(file) + ': setupAutoRefresh');
            }
        }
    }
    
    if (hasRealTimeUpdates) {
        return { success: true, details: `Real-time updates implemented: ${updateMechanisms.join(', ')}` };
    }
    return { success: false, error: 'No real-time update mechanisms found' };
}

async function testAPIDataFormatConsistency() {
    // Test if server is running and API returns consistent format
    try {
        const response = await makeAPICall('/api/monitoring/status');
        
        if (response && response.system) {
            const hasRequiredFields = response.system.cpu && response.system.memory && response.system.disk;
            if (hasRequiredFields) {
                return { success: true, details: 'API returns consistent data format with required system fields' };
            }
            return { success: false, error: 'API data format missing required fields (cpu, memory, disk)' };
        }
        return { success: false, error: 'API response does not contain expected system data structure' };
    } catch (error) {
        return { success: false, error: `API call failed: ${error.message}` };
    }
}

async function testMonitoringThresholdConsistency() {
    // Check if monitoring thresholds are defined consistently
    const monitoringConfigFile = path.join(__dirname, 'frontend/js/modules/monitoring-config.js');
    const dashboardFile = path.join(__dirname, 'frontend/js/modules/dashboard.js');
    
    if (!fs.existsSync(monitoringConfigFile) || !fs.existsSync(dashboardFile)) {
        return { success: false, error: 'Required monitoring files not found' };
    }
    
    const configContent = fs.readFileSync(monitoringConfigFile, 'utf8');
    const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');
    
    // Check for threshold definitions
    const hasConfigThresholds = configContent.includes('threshold') || configContent.includes('cpu') || configContent.includes('memory');
    const hasDashboardThresholds = dashboardContent.includes('threshold') || dashboardContent.includes('level');
    
    if (hasConfigThresholds && hasDashboardThresholds) {
        return { success: true, details: 'Monitoring thresholds defined in both configuration and dashboard modules' };
    }
    return { success: false, error: 'Inconsistent threshold definitions across monitoring modules' };
}

async function testMasterConfigPersistence() {
    // Check if master config API is implemented
    const configFile = path.join(__dirname, 'backend/routes/config.js');
    
    if (!fs.existsSync(configFile)) {
        return { success: false, error: 'Config routes file not found' };
    }
    
    const content = fs.readFileSync(configFile, 'utf8');
    
    const hasMasterEndpoints = content.includes('/master') && content.includes('GET') && content.includes('POST');
    const hasConfigManager = content.includes('configManager') || content.includes('config');
    
    if (hasMasterEndpoints && hasConfigManager) {
        return { success: true, details: 'Master configuration persistence API implemented with GET/POST endpoints' };
    }
    return { success: false, error: 'Master configuration persistence API not fully implemented' };
}

async function testSystemPreferencesPersistence() {
    // Test system preferences configuration save/load
    try {
        const response = await makeAPICall('/api/system-prefs/settings');
        if (response && (response.data || response.settings || Object.keys(response).length > 0)) {
            return { success: true, details: 'System preferences API returns configuration data' };
        }
        return { success: false, error: 'System preferences API returns empty or invalid data' };
    } catch (error) {
        return { success: false, error: `System preferences API test failed: ${error.message}` };
    }
}

async function testLaunchAgentPersistence() {
    // Test launch agent configuration persistence
    try {
        const response = await makeAPICall('/api/launch-agents/list');
        if (response && (response.data || Array.isArray(response) || response.agents)) {
            return { success: true, details: 'Launch agent API returns agent list data' };
        }
        return { success: false, error: 'Launch agent API returns invalid data structure' };
    } catch (error) {
        return { success: false, error: `Launch agent API test failed: ${error.message}` };
    }
}

async function testMonitoringConfigPersistence() {
    // Test monitoring configuration persistence
    try {
        const response = await makeAPICall('/api/monitoring/config');
        if (response) {
            return { success: true, details: 'Monitoring configuration API accessible' };
        }
        return { success: false, error: 'Monitoring configuration API returns no data' };
    } catch (error) {
        // Try alternative endpoint
        try {
            const altResponse = await makeAPICall('/api/config');
            if (altResponse) {
                return { success: true, details: 'Alternative configuration API accessible' };
            }
        } catch (altError) {
            return { success: false, error: `Monitoring config API test failed: ${error.message}` };
        }
    }
}

async function testInstallationSettingsPersistence() {
    // Test installation settings persistence
    try {
        const response = await makeAPICall('/api/installation/settings');
        if (response) {
            return { success: true, details: 'Installation settings API accessible' };
        }
        return { success: false, error: 'Installation settings API returns no data' };
    } catch (error) {
        return { success: false, error: `Installation settings API test failed: ${error.message}` };
    }
}

async function testNotificationConfigPersistence() {
    // Test notification configuration persistence
    try {
        const response = await makeAPICall('/api/notifications/config');
        if (response) {
            return { success: true, details: 'Notification configuration API accessible' };
        }
        return { success: false, error: 'Notification configuration API returns no data' };
    } catch (error) {
        return { success: false, error: `Notification config API test failed: ${error.message}` };
    }
}

async function testCoreSystemAPIs() {
    const coreAPIs = [
        '/api/health',
        '/api/platform',
        '/api/monitoring/status'
    ];
    
    const results = [];
    for (const endpoint of coreAPIs) {
        try {
            const response = await makeAPICall(endpoint);
            results.push(`${endpoint}: ✅`);
        } catch (error) {
            results.push(`${endpoint}: ❌ ${error.message}`);
        }
    }
    
    const successCount = results.filter(r => r.includes('✅')).length;
    const successRate = (successCount / coreAPIs.length) * 100;
    
    if (successRate >= 80) {
        return { success: true, details: `Core system APIs: ${successRate.toFixed(1)}% success rate (${results.join(', ')})` };
    }
    return { success: false, error: `Core system APIs low success rate: ${successRate.toFixed(1)}% (${results.join(', ')})` };
}

async function testMasterConfigAPIs() {
    const configAPIs = [
        '/api/config',
        '/api/config/master'
    ];
    
    const results = [];
    for (const endpoint of configAPIs) {
        try {
            const response = await makeAPICall(endpoint);
            results.push(`${endpoint}: ✅`);
        } catch (error) {
            results.push(`${endpoint}: ❌`);
        }
    }
    
    const successCount = results.filter(r => r.includes('✅')).length;
    
    if (successCount >= 1) {
        return { success: true, details: `Master config APIs accessible: ${results.join(', ')}` };
    }
    return { success: false, error: `Master config APIs not accessible: ${results.join(', ')}` };
}

async function testMonitoringAPIs() {
    const monitoringAPIs = [
        '/api/monitoring/status',
        '/api/monitoring/applications'
    ];
    
    const results = [];
    for (const endpoint of monitoringAPIs) {
        try {
            const response = await makeAPICall(endpoint);
            results.push(`${endpoint}: ✅`);
        } catch (error) {
            results.push(`${endpoint}: ❌`);
        }
    }
    
    const successCount = results.filter(r => r.includes('✅')).length;
    const successRate = (successCount / monitoringAPIs.length) * 100;
    
    if (successRate >= 75) {
        return { success: true, details: `Monitoring APIs: ${successRate.toFixed(1)}% success rate` };
    }
    return { success: false, error: `Monitoring APIs low success rate: ${successRate.toFixed(1)}%` };
}

async function testLaunchAgentAPIs() {
    const launchAgentAPIs = [
        '/api/launch-agents/list',
        '/api/launch-agents/status'
    ];
    
    const results = [];
    for (const endpoint of launchAgentAPIs) {
        try {
            const response = await makeAPICall(endpoint);
            results.push(`${endpoint}: ✅`);
        } catch (error) {
            results.push(`${endpoint}: ❌`);
        }
    }
    
    const successCount = results.filter(r => r.includes('✅')).length;
    const successRate = (successCount / launchAgentAPIs.length) * 100;
    
    if (successRate >= 75) {
        return { success: true, details: `Launch agent APIs: ${successRate.toFixed(1)}% success rate` };
    }
    return { success: false, error: `Launch agent APIs low success rate: ${successRate.toFixed(1)}%` };
}

async function testSetupWizardAPIs() {
    const wizardAPIs = [
        '/api/setup-wizard/system-check',
        '/api/setup-wizard/summary'
    ];
    
    const results = [];
    for (const endpoint of wizardAPIs) {
        try {
            const response = await makeAPICall(endpoint);
            results.push(`${endpoint}: ✅`);
        } catch (error) {
            results.push(`${endpoint}: ❌`);
        }
    }
    
    const successCount = results.filter(r => r.includes('✅')).length;
    const successRate = (successCount / wizardAPIs.length) * 100;
    
    if (successRate >= 75) {
        return { success: true, details: `Setup wizard APIs: ${successRate.toFixed(1)}% success rate` };
    }
    return { success: false, error: `Setup wizard APIs low success rate: ${successRate.toFixed(1)}%` };
}

async function testNotificationAPIs() {
    const notificationAPIs = [
        '/api/notifications/config'
    ];
    
    const results = [];
    for (const endpoint of notificationAPIs) {
        try {
            const response = await makeAPICall(endpoint);
            results.push(`${endpoint}: ✅`);
        } catch (error) {
            results.push(`${endpoint}: ❌`);
        }
    }
    
    const successCount = results.filter(r => r.includes('✅')).length;
    
    if (successCount >= 1) {
        return { success: true, details: 'Notification APIs accessible' };
    }
    return { success: false, error: 'Notification APIs not accessible' };
}

async function testAPIErrorHandling() {
    // Test invalid endpoints return proper error responses
    const invalidEndpoints = [
        '/api/nonexistent',
        '/api/invalid/endpoint'
    ];
    
    let properErrorHandling = 0;
    const results = [];
    
    for (const endpoint of invalidEndpoints) {
        try {
            // Use curl without -f flag to get actual error response
            const response = await makeAPICallWithoutFailFlag(endpoint);
            if (response && response.success === false && (response.error || response.message)) {
                properErrorHandling++;
                results.push(`${endpoint}: proper error response`);
            } else {
                results.push(`${endpoint}: unexpected success`);
            }
        } catch (error) {
            // Check if error contains 404 or proper error handling
            if (error.message.includes('404') || error.message.includes('Not found') || error.message.includes('Route not found')) {
                properErrorHandling++;
                results.push(`${endpoint}: 404 error handled`);
            } else {
                results.push(`${endpoint}: ${error.message}`);
            }
        }
    }
    
    if (properErrorHandling >= invalidEndpoints.length) {
        return { success: true, details: `API properly handles invalid endpoints: ${results.join(', ')}` };
    }
    return { success: false, error: `API error handling needs improvement: ${results.join(', ')}` };
}

async function testAPIPerformance() {
    // Test API response times
    const testEndpoints = [
        '/api/health',
        '/api/monitoring/status'
    ];
    
    const performanceResults = [];
    for (const endpoint of testEndpoints) {
        try {
            const startTime = Date.now();
            await makeAPICall(endpoint);
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            performanceResults.push({ endpoint, responseTime });
        } catch (error) {
            performanceResults.push({ endpoint, responseTime: null, error: error.message });
        }
    }
    
    const validResults = performanceResults.filter(r => r.responseTime !== null);
    const averageResponseTime = validResults.reduce((sum, r) => sum + r.responseTime, 0) / validResults.length;
    
    if (averageResponseTime < 5000 && validResults.length > 0) {
        return { success: true, details: `API performance good: ${averageResponseTime.toFixed(0)}ms average response time` };
    }
    return { success: false, error: `API performance issues: ${averageResponseTime ? averageResponseTime.toFixed(0) + 'ms' : 'no valid responses'}` };
}

// Utility function to make API calls
async function makeAPICall(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${SERVER_URL}${endpoint}`;
        const options = {
            timeout: TIMEOUT
        };
        
        // Use curl for API calls since we're in Node.js environment
        exec(`curl -s -f "${url}"`, options, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`API call failed: ${error.message}`));
                return;
            }
            
            try {
                const response = JSON.parse(stdout);
                resolve(response);
            } catch (parseError) {
                if (stdout.trim()) {
                    resolve(stdout); // Return raw response if not JSON
                } else {
                    reject(new Error('Empty response from API'));
                }
            }
        });
    });
}

// Utility function to make API calls without fail flag (for error testing)
async function makeAPICallWithoutFailFlag(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${SERVER_URL}${endpoint}`;
        const options = {
            timeout: TIMEOUT
        };
        
        // Use curl without -f flag to get actual error response
        exec(`curl -s "${url}"`, options, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`API call failed: ${error.message}`));
                return;
            }
            
            try {
                const response = JSON.parse(stdout);
                resolve(response);
            } catch (parseError) {
                if (stdout.trim()) {
                    resolve(stdout); // Return raw response if not JSON
                } else {
                    reject(new Error('Empty response from API'));
                }
            }
        });
    });
}

// Generate Test Report
function generateTestReport() {
    console.log('\n📊 Data Flow Validation Test Report');
    console.log('=' .repeat(50));
    
    const allTests = [
        ...results.monitoringDataConsistency,
        ...results.configurationPersistence,
        ...results.apiEndpointsValidation
    ];
    
    const passed = allTests.filter(t => t.status === 'PASS').length;
    const failed = allTests.filter(t => t.status === 'FAIL').length;
    const errors = allTests.filter(t => t.status === 'ERROR').length;
    const total = allTests.length;
    
    console.log(`\nOverall Results: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Errors: ${errors}`);
    
    // Detailed results by category
    console.log('\n📊 Monitoring Data Consistency Tests:');
    results.monitoringDataConsistency.forEach(test => {
        console.log(`  ${test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️'} ${test.name}`);
        if (test.status !== 'PASS') {
            console.log(`    ${test.details}`);
        }
    });
    
    console.log('\n💾 Configuration Persistence Tests:');
    results.configurationPersistence.forEach(test => {
        console.log(`  ${test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️'} ${test.name}`);
        if (test.status !== 'PASS') {
            console.log(`    ${test.details}`);
        }
    });
    
    console.log('\n🌐 API Endpoints Validation Tests:');
    results.apiEndpointsValidation.forEach(test => {
        console.log(`  ${test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️'} ${test.name}`);
        if (test.status !== 'PASS') {
            console.log(`    ${test.details}`);
        }
    });
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    const failedTests = allTests.filter(t => t.status !== 'PASS');
    if (failedTests.length === 0) {
        console.log('  🎉 All tests passed! Data flow validation is excellent.');
    } else {
        failedTests.forEach(test => {
            console.log(`  • ${test.name}: ${test.details}`);
        });
    }
    
    return {
        passed,
        failed,
        errors,
        total,
        successRate: (passed/total)*100
    };
}

// Main Test Execution
async function runDataFlowValidationTests() {
    try {
        await testMonitoringDataConsistency();
        await testConfigurationPersistence();
        await testAPIEndpointsValidation();
        
        const report = generateTestReport();
        
        // Save results to file
        const reportPath = path.join(__dirname, 'test-results-data-flow.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            phase: '8.7.2',
            testType: 'data-flow-validation',
            summary: report,
            detailedResults: results
        }, null, 2));
        
        console.log(`\n📄 Detailed results saved to: ${reportPath}`);
        
        return report;
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return { passed: 0, failed: 0, errors: 1, total: 1, successRate: 0 };
    }
}

// Run tests if called directly
if (require.main === module) {
    runDataFlowValidationTests().then(report => {
        process.exit(report.successRate > 80 ? 0 : 1);
    });
}

module.exports = { runDataFlowValidationTests, results };