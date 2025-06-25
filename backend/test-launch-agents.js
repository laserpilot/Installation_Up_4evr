#!/usr/bin/env node

/**
 * Test script for Launch Agent Manager
 * Run with: node backend/test-launch-agents.js
 */

const LaunchAgentManager = require('./modules/launch-agents');
const path = require('path');

async function testLaunchAgents() {
    console.log('🚀 Testing Launch Agent Manager\n');
    
    const manager = new LaunchAgentManager();
    
    try {
        // Test with TextEdit (should be available on all Macs)
        const testAppPath = '/Applications/TextEdit.app';
        
        console.log('📱 Testing App Info Extraction...');
        try {
            const appInfo = await manager.getAppInfo(testAppPath);
            console.log('✅ App Info Retrieved:');
            console.log(`   App Name: ${appInfo.appName}`);
            console.log(`   Display Name: ${appInfo.displayName}`);
            console.log(`   Bundle ID: ${appInfo.bundleIdentifier}`);
            console.log(`   Version: ${appInfo.version}`);
            console.log(`   Executable: ${appInfo.executablePath}`);
        } catch (error) {
            console.log(`❌ Could not get app info for ${testAppPath}: ${error.message}`);
            console.log('💡 Try changing testAppPath to an app that exists on your system');
        }
        console.log('');

        // Test plist generation (without creating files)
        console.log('📝 Testing Plist Generation...');
        const testOptions = {
            label: 'com.test.textedit.up4evr',
            executablePath: '/Applications/TextEdit.app/Contents/MacOS/TextEdit',
            keepAlive: true,
            successfulExit: true,
            processType: 'Interactive',
            runAtLoad: true
        };
        
        const plistContent = manager.generatePlist(testOptions);
        console.log('✅ Sample Plist Generated:');
        console.log('---');
        console.log(plistContent);
        console.log('---');
        console.log('');

        // List existing launch agents
        console.log('📋 Listing Existing Launch Agents...');
        try {
            const existingAgents = await manager.listLaunchAgents();
            console.log(`Found ${existingAgents.length} launch agents:`);
            
            if (existingAgents.length > 0) {
                existingAgents.forEach(agent => {
                    if (agent.error) {
                        console.log(`❌ ${agent.filename} - Error: ${agent.error}`);
                    } else {
                        console.log(`📄 ${agent.filename} (${agent.label})`);
                        console.log(`   Modified: ${agent.modified.toLocaleDateString()}`);
                        console.log(`   Size: ${agent.size} bytes`);
                    }
                });
            } else {
                console.log('   No custom launch agents found');
            }
        } catch (error) {
            console.log(`❌ Could not list launch agents: ${error.message}`);
        }
        console.log('');

        // Check status of running launch agents
        console.log('⚡ Checking Launch Agent Status...');
        try {
            const runningAgents = await manager.getLaunchAgentStatus();
            console.log(`Found ${runningAgents.length} loaded launch agents:`);
            
            const relevantAgents = runningAgents.filter(agent => 
                agent.label.includes('up4evr') || 
                agent.label.includes('TextEdit') ||
                !agent.label.startsWith('com.apple.')
            ).slice(0, 5); // Show first 5 non-Apple agents
            
            if (relevantAgents.length > 0) {
                relevantAgents.forEach(agent => {
                    const status = agent.pid ? `Running (PID: ${agent.pid})` : 'Loaded but not running';
                    console.log(`🔄 ${agent.label} - ${status}`);
                });
            } else {
                console.log('   No custom launch agents currently loaded');
            }
            
            if (runningAgents.length > 10) {
                console.log(`   ... and ${runningAgents.length - 5} more system agents`);
            }
        } catch (error) {
            console.log(`❌ Could not check launch agent status: ${error.message}`);
        }
        console.log('');

        console.log('✅ Launch Agent Manager test completed successfully!');
        console.log('');
        console.log('💡 To create a launch agent for real, you can run:');
        console.log('   const result = await manager.installLaunchAgent("/path/to/your/app.app");');
        console.log('   console.log(result);');
        console.log('');
        console.log('🔧 Available methods:');
        console.log('   - createLaunchAgent() - Generate plist file');
        console.log('   - installLaunchAgent() - Create and load launch agent');
        console.log('   - loadLaunchAgent() - Load existing plist');
        console.log('   - unloadLaunchAgent() - Unload running agent');
        console.log('   - deleteLaunchAgent() - Remove plist file');
        console.log('   - listLaunchAgents() - Show all user agents');
        console.log('   - getLaunchAgentStatus() - Check running status');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testLaunchAgents();
}

module.exports = testLaunchAgents;