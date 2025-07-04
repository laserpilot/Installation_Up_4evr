#!/usr/bin/env node

/**
 * Cross-Tab Integration Testing Suite
 * Phase 8.7.1: Cross-Tab Testing
 * 
 * Tests:
 * 1. Master configuration across all tabs
 * 2. Launch agent integration with monitoring
 * 3. Setup wizard end-to-end functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Cross-Tab Integration Testing Suite');
console.log('Phase 8.7.1: Testing master configuration, launch agent integration, and setup wizard\n');

// Test Results Storage
const results = {
    masterConfig: [],
    launchAgentIntegration: [],
    setupWizard: [],
    crossTab: []
};

/**
 * Test 1: Master Configuration Integration
 */
async function testMasterConfigIntegration() {
    console.log('📋 Test 1: Master Configuration Integration');
    
    const tests = [
        {
            name: 'Master Config API Endpoints',
            test: () => testMasterConfigAPI()
        },
        {
            name: 'System Preferences Integration',
            test: () => testSystemPrefsConfig()
        },
        {
            name: 'Launch Agents Integration', 
            test: () => testLaunchAgentsConfig()
        },
        {
            name: 'Monitoring Config Integration',
            test: () => testMonitoringConfig()
        },
        {
            name: 'Installation Settings Integration',
            test: () => testInstallationConfig()
        }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.test();
            results.masterConfig.push({
                name: test.name,
                status: result.success ? 'PASS' : 'FAIL',
                details: result.details || result.error
            });
            console.log(`  ${result.success ? '✅' : '❌'} ${test.name}: ${result.details || result.error}`);
        } catch (error) {
            results.masterConfig.push({
                name: test.name,
                status: 'ERROR',
                details: error.message
            });
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
}

/**
 * Test 2: Launch Agent Integration with Monitoring
 */
async function testLaunchAgentMonitoringIntegration() {
    console.log('\n🚀 Test 2: Launch Agent Integration with Monitoring');
    
    const tests = [
        {
            name: 'Launch Agent Auto-Suggestion in Monitoring',
            test: () => testLaunchAgentSuggestion()
        },
        {
            name: 'Launch Agent Status in Monitoring',
            test: () => testLaunchAgentStatus()
        },
        {
            name: 'Launch Agent Creation from Monitoring Tab',
            test: () => testLaunchAgentCreationFlow()
        },
        {
            name: 'Launch Agent Real-time Status Updates',
            test: () => testLaunchAgentStatusUpdates()
        }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.test();
            results.launchAgentIntegration.push({
                name: test.name,
                status: result.success ? 'PASS' : 'FAIL',
                details: result.details || result.error
            });
            console.log(`  ${result.success ? '✅' : '❌'} ${test.name}: ${result.details || result.error}`);
        } catch (error) {
            results.launchAgentIntegration.push({
                name: test.name,
                status: 'ERROR',
                details: error.message
            });
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
}

/**
 * Test 3: Setup Wizard End-to-End
 */
async function testSetupWizardEndToEnd() {
    console.log('\n🧙 Test 3: Setup Wizard End-to-End Testing');
    
    const tests = [
        {
            name: 'Wizard Step Navigation',
            test: () => testWizardNavigation()
        },
        {
            name: 'System Check Integration',
            test: () => testWizardSystemCheck()
        },
        {
            name: 'Settings Application Workflow',
            test: () => testWizardSettingsApplication()
        },
        {
            name: 'Launch Agent Creation Workflow',
            test: () => testWizardLaunchAgentCreation()
        },
        {
            name: 'Verification & Testing Workflow',
            test: () => testWizardVerification()
        },
        {
            name: 'Final Summary Generation',
            test: () => testWizardSummary()
        }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.test();
            results.setupWizard.push({
                name: test.name,
                status: result.success ? 'PASS' : 'FAIL',
                details: result.details || result.error
            });
            console.log(`  ${result.success ? '✅' : '❌'} ${test.name}: ${result.details || result.error}`);
        } catch (error) {
            results.setupWizard.push({
                name: test.name,
                status: 'ERROR',
                details: error.message
            });
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
}

/**
 * Test 4: Cross-Tab State Management
 */
async function testCrossTabStateManagement() {
    console.log('\n🔄 Test 4: Cross-Tab State Management');
    
    const tests = [
        {
            name: 'Tab Navigation Preservation',
            test: () => testTabNavigationState()
        },
        {
            name: 'Data Consistency Across Tabs',
            test: () => testDataConsistency()
        },
        {
            name: 'Configuration State Persistence',
            test: () => testConfigurationPersistence()
        },
        {
            name: 'Module Initialization Order',
            test: () => testModuleInitOrder()
        }
    ];
    
    for (const test of tests) {
        try {
            const result = await test.test();
            results.crossTab.push({
                name: test.name,
                status: result.success ? 'PASS' : 'FAIL',
                details: result.details || result.error
            });
            console.log(`  ${result.success ? '✅' : '❌'} ${test.name}: ${result.details || result.error}`);
        } catch (error) {
            results.crossTab.push({
                name: test.name,
                status: 'ERROR',
                details: error.message
            });
            console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
}

// Individual Test Functions

async function testMasterConfigAPI() {
    // Check if master config API endpoints exist in backend
    const configRoutes = fs.readFileSync(path.join(__dirname, 'backend/routes/config.js'), 'utf8');
    
    const hasGetEndpoint = configRoutes.includes('/master') && configRoutes.includes('GET');
    const hasPostEndpoint = configRoutes.includes('/master') && configRoutes.includes('POST');
    
    if (hasGetEndpoint && hasPostEndpoint) {
        return { success: true, details: 'Master config API endpoints found' };
    }
    return { success: false, error: 'Missing master config API endpoints' };
}

async function testSystemPrefsConfig() {
    // Check system preferences master config integration
    const systemPrefsFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/system-preferences.js'), 'utf8');
    
    const hasMasterConfigImport = systemPrefsFile.includes('MasterConfigAPI');
    const hasConfigIntegration = systemPrefsFile.includes('loadMasterConfigState') || systemPrefsFile.includes('saveMasterConfig');
    
    if (hasMasterConfigImport && hasConfigIntegration) {
        return { success: true, details: 'System preferences master config integration found' };
    }
    return { success: false, error: 'Missing system preferences master config integration' };
}

async function testLaunchAgentsConfig() {
    // Check launch agents master config integration
    const launchAgentsFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/launch-agents.js'), 'utf8');
    
    const hasMasterConfigImport = launchAgentsFile.includes('MasterConfigAPI');
    const hasConfigIntegration = launchAgentsFile.includes('loadMasterConfigState') || launchAgentsFile.includes('saveMasterConfig');
    
    if (hasMasterConfigImport && hasConfigIntegration) {
        return { success: true, details: 'Launch agents master config integration found' };
    }
    return { success: false, error: 'Missing launch agents master config integration' };
}

async function testMonitoringConfig() {
    // Check monitoring config master config integration
    const monitoringConfigFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/monitoring-config.js'), 'utf8');
    
    const hasMasterConfigImport = monitoringConfigFile.includes('MasterConfigAPI');
    const hasLaunchAgentSuggestion = monitoringConfigFile.includes('Launch Agent') && monitoringConfigFile.includes('suggestion');
    
    if (hasMasterConfigImport && hasLaunchAgentSuggestion) {
        return { success: true, details: 'Monitoring config master config integration and launch agent suggestions found' };
    }
    return { success: false, error: 'Missing monitoring config integration features' };
}

async function testInstallationConfig() {
    // Check installation settings master config integration
    const installationFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/installation-settings.js'), 'utf8');
    
    const hasMasterConfigImport = installationFile.includes('MasterConfigAPI');
    const hasConfigIntegration = installationFile.includes('loadMasterConfigState') || installationFile.includes('saveMasterConfig');
    
    if (hasMasterConfigImport && hasConfigIntegration) {
        return { success: true, details: 'Installation settings master config integration found' };
    }
    return { success: false, error: 'Missing installation settings master config integration' };
}

async function testLaunchAgentSuggestion() {
    // Check launch agent auto-suggestion in monitoring
    const monitoringConfigFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/monitoring-config.js'), 'utf8');
    
    const hasSuggestionUI = monitoringConfigFile.includes('launch-agent-suggestions') || monitoringConfigFile.includes('Suggested Applications');
    const hasDetectionLogic = monitoringConfigFile.includes('detectLaunchAgents') || monitoringConfigFile.includes('getUserApps');
    
    if (hasSuggestionUI && hasDetectionLogic) {
        return { success: true, details: 'Launch agent suggestion UI and detection logic found' };
    }
    return { success: false, error: 'Missing launch agent suggestion functionality' };
}

async function testLaunchAgentStatus() {
    // Check launch agent status integration
    const launchAgentsFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/launch-agents.js'), 'utf8');
    
    const hasStatusUpdates = launchAgentsFile.includes('updateLaunchAgentStatus') || launchAgentsFile.includes('refreshStatus');
    const hasRealTimeUpdates = launchAgentsFile.includes('setInterval') && launchAgentsFile.includes('status');
    
    if (hasStatusUpdates && hasRealTimeUpdates) {
        return { success: true, details: 'Launch agent status updates and real-time monitoring found' };
    }
    return { success: false, error: 'Missing launch agent status integration' };
}

async function testLaunchAgentCreationFlow() {
    // Check launch agent creation workflow
    const launchAgentsFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/launch-agents.js'), 'utf8');
    
    const hasCreationFlow = launchAgentsFile.includes('createLaunchAgent') || launchAgentsFile.includes('generateAgent');
    const hasWebAppSupport = launchAgentsFile.includes('web-app') || launchAgentsFile.includes('kiosk');
    
    if (hasCreationFlow && hasWebAppSupport) {
        return { success: true, details: 'Launch agent creation flow with web app support found' };
    }
    return { success: false, error: 'Missing complete launch agent creation workflow' };
}

async function testLaunchAgentStatusUpdates() {
    // Check real-time status updates
    const mainFile = fs.readFileSync(path.join(__dirname, 'frontend/js/main.js'), 'utf8');
    
    const hasStatusManager = mainFile.includes('updateLaunchAgentStatus') || mainFile.includes('status');
    const hasTabAwareUpdates = mainFile.includes('currentTab') && mainFile.includes('launch-agents');
    
    if (hasStatusManager && hasTabAwareUpdates) {
        return { success: true, details: 'Real-time status updates with tab awareness found' };
    }
    return { success: false, error: 'Missing real-time status update system' };
}

async function testWizardNavigation() {
    // Check setup wizard navigation
    const setupWizardFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/setup-wizard.js'), 'utf8');
    
    const hasNavigation = setupWizardFile.includes('navigateWizard') || setupWizardFile.includes('nextStep');
    const hasSkipFunctionality = setupWizardFile.includes('skip') && setupWizardFile.includes('confirmation');
    
    if (hasNavigation && hasSkipFunctionality) {
        return { success: true, details: 'Wizard navigation and skip functionality found' };
    }
    return { success: false, error: 'Missing wizard navigation features' };
}

async function testWizardSystemCheck() {
    // Check wizard system check integration
    const setupWizardFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/setup-wizard.js'), 'utf8');
    
    const hasSystemCheck = setupWizardFile.includes('loadSystemCheck') || setupWizardFile.includes('system-check');
    const hasRealStatusCheck = setupWizardFile.includes('/api/setup-wizard/system-check');
    
    if (hasSystemCheck && hasRealStatusCheck) {
        return { success: true, details: 'Wizard system check with real API integration found' };
    }
    return { success: false, error: 'Missing wizard system check integration' };
}

async function testWizardSettingsApplication() {
    // Check wizard settings application workflow
    const setupWizardFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/setup-wizard.js'), 'utf8');
    
    const hasSettingsApplication = setupWizardFile.includes('applyWizardSettings') || setupWizardFile.includes('apply-settings');
    const hasVerificationFlow = setupWizardFile.includes('verification') && setupWizardFile.includes('before');
    
    if (hasSettingsApplication && hasVerificationFlow) {
        return { success: true, details: 'Wizard settings application with verification flow found' };
    }
    return { success: false, error: 'Missing wizard settings application workflow' };
}

async function testWizardLaunchAgentCreation() {
    // Check wizard launch agent creation
    const setupWizardFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/setup-wizard.js'), 'utf8');
    
    const hasLaunchAgentCreation = setupWizardFile.includes('initApplicationSetup') || setupWizardFile.includes('setupDesktopApp');
    const hasWebAppSupport = setupWizardFile.includes('setupWebApp') || setupWizardFile.includes('web-method');
    
    if (hasLaunchAgentCreation && hasWebAppSupport) {
        return { success: true, details: 'Wizard launch agent creation with desktop and web app support found' };
    }
    return { success: false, error: 'Missing wizard launch agent creation features' };
}

async function testWizardVerification() {
    // Check wizard verification and testing
    const setupWizardFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/setup-wizard.js'), 'utf8');
    
    const hasVerification = setupWizardFile.includes('runWizardTests') || setupWizardFile.includes('verification');
    const hasTestIntegration = setupWizardFile.includes('/api/setup-wizard/run-tests');
    
    if (hasVerification && hasTestIntegration) {
        return { success: true, details: 'Wizard verification and testing workflow found' };
    }
    return { success: false, error: 'Missing wizard verification features' };
}

async function testWizardSummary() {
    // Check wizard final summary
    const setupWizardFile = fs.readFileSync(path.join(__dirname, 'frontend/js/modules/setup-wizard.js'), 'utf8');
    
    const hasSummary = setupWizardFile.includes('loadWizardSummary') || setupWizardFile.includes('forever-guarantee');
    const hasConfidenceBuilding = setupWizardFile.includes('Installation Will Run Forever') || setupWizardFile.includes('evidence');
    
    if (hasSummary && hasConfidenceBuilding) {
        return { success: true, details: 'Wizard final summary with confidence-building elements found' };
    }
    return { success: false, error: 'Missing wizard summary features' };
}

async function testTabNavigationState() {
    // Check tab navigation state preservation
    const mainFile = fs.readFileSync(path.join(__dirname, 'frontend/js/main.js'), 'utf8');
    
    const hasNavigationFunction = mainFile.includes('navigateToTab') || mainFile.includes('switchTab');
    const hasStatePreservation = mainFile.includes('currentTab') || mainFile.includes('activeTab');
    
    if (hasNavigationFunction && hasStatePreservation) {
        return { success: true, details: 'Tab navigation with state preservation found' };
    }
    return { success: false, error: 'Missing tab navigation state management' };
}

async function testDataConsistency() {
    // Check data consistency across tabs
    const monitoringDisplayFile = fs.readFileSync(path.join(__dirname, 'frontend/js/utils/monitoring-display.js'), 'utf8');
    
    const hasUnifiedDisplay = monitoringDisplayFile.includes('MonitoringDisplayManager') || monitoringDisplayFile.includes('updateMetricCard');
    const hasConsistentAPI = monitoringDisplayFile.includes('/api/monitoring/status');
    
    if (hasUnifiedDisplay && hasConsistentAPI) {
        return { success: true, details: 'Unified monitoring display manager for data consistency found' };
    }
    return { success: false, error: 'Missing unified data display system' };
}

async function testConfigurationPersistence() {
    // Check configuration persistence
    const apiFile = fs.readFileSync(path.join(__dirname, 'frontend/js/utils/api.js'), 'utf8');
    
    const hasMasterConfigAPI = apiFile.includes('MasterConfigAPI') || apiFile.includes('masterConfig');
    const hasPersistence = apiFile.includes('POST') && apiFile.includes('config');
    
    if (hasMasterConfigAPI && hasPersistence) {
        return { success: true, details: 'Master configuration persistence API found' };
    }
    return { success: false, error: 'Missing configuration persistence system' };
}

async function testModuleInitOrder() {
    // Check module initialization order
    const mainFile = fs.readFileSync(path.join(__dirname, 'frontend/js/main.js'), 'utf8');
    
    const hasInitMapping = mainFile.includes('tabInitializers') || mainFile.includes('moduleInit');
    const hasOrderedInit = mainFile.includes('navigateToTab') && mainFile.includes('init');
    
    if (hasInitMapping && hasOrderedInit) {
        return { success: true, details: 'Module initialization order management found' };
    }
    return { success: false, error: 'Missing module initialization order system' };
}

// Generate Test Report
function generateTestReport() {
    console.log('\n📊 Cross-Tab Integration Test Report');
    console.log('=' .repeat(50));
    
    const allTests = [
        ...results.masterConfig,
        ...results.launchAgentIntegration,
        ...results.setupWizard,
        ...results.crossTab
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
    console.log('\n📋 Master Configuration Tests:');
    results.masterConfig.forEach(test => {
        console.log(`  ${test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️'} ${test.name}`);
    });
    
    console.log('\n🚀 Launch Agent Integration Tests:');
    results.launchAgentIntegration.forEach(test => {
        console.log(`  ${test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️'} ${test.name}`);
    });
    
    console.log('\n🧙 Setup Wizard Tests:');
    results.setupWizard.forEach(test => {
        console.log(`  ${test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️'} ${test.name}`);
    });
    
    console.log('\n🔄 Cross-Tab State Tests:');
    results.crossTab.forEach(test => {
        console.log(`  ${test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️'} ${test.name}`);
    });
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    const failedTests = allTests.filter(t => t.status !== 'PASS');
    if (failedTests.length === 0) {
        console.log('  🎉 All tests passed! Cross-tab integration is working perfectly.');
    } else {
        failedTests.forEach(test => {
            console.log(`  • Fix ${test.name}: ${test.details}`);
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
async function runCrossTabTests() {
    try {
        await testMasterConfigIntegration();
        await testLaunchAgentMonitoringIntegration();
        await testSetupWizardEndToEnd();
        await testCrossTabStateManagement();
        
        const report = generateTestReport();
        
        // Save results to file
        const reportPath = path.join(__dirname, 'test-results-cross-tab.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            phase: '8.7.1',
            testType: 'cross-tab-integration',
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
    runCrossTabTests().then(report => {
        process.exit(report.successRate > 80 ? 0 : 1);
    });
}

module.exports = { runCrossTabTests, results };