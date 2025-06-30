#!/usr/bin/env node

/**
 * Test script for Launch Agent Manager (Platform Architecture)
 * Run with: node backend/test-launch-agents.js
 */

const PlatformManager = require('./src/core/platform-manager');
const path = require('path');

async function testLaunchAgents() {
    console.log('🚀 Testing Launch Agent Manager (Platform Architecture)\n');
    
    const platform = new PlatformManager();
    await platform.initialize();
    const manager = platform.getProcessManager();
    
    try {
        // Test with TextEdit (should be available on all Macs)
        const testAppPath = '/Applications/TextEdit.app';
        
        console.log('📱 Testing Running Applications...');
        try {
            const runningApps = await manager.getRunningApplications();
            console.log(`✅ Found ${runningApps.length} running applications:`);
            runningApps.slice(0, 5).forEach(app => {
                console.log(`   ${app.name} (PID: ${app.pid})`);
            });
            if (runningApps.length > 5) {
                console.log(`   ... and ${runningApps.length - 5} more`);
            }
        } catch (error) {
            console.log(`❌ Could not get running applications: ${error.message}`);
        }
        console.log('');

        // Test plist generation (without creating files)
        console.log('📝 Testing Plist Generation...');
        const testOptions = {
            label: 'com.test.textedit.up4evr',
            program: '/Applications/TextEdit.app',
            description: 'Test launch agent for TextEdit',
            keepAlive: true,
            runAtLoad: true
        };
        
        const plistContent = manager.generateLaunchAgentPlist(testOptions);
        console.log('✅ Sample Plist Generated:');
        console.log('---');
        console.log(plistContent);
        console.log('---');
        console.log('');

        // List existing auto-start entries  
        console.log('📋 Listing Existing Auto-Start Entries...');
        try {
            const autoStartEntries = await manager.getAutoStartEntries();
            console.log(`Found ${autoStartEntries.length} Up4evr auto-start entries:`);
            
            if (autoStartEntries.length > 0) {
                autoStartEntries.forEach(entry => {
                    const status = entry.loaded ? '🟢 Loaded' : '🟡 Not loaded';
                    console.log(`📄 ${entry.name} - ${status}`);
                    console.log(`   Label: ${entry.label}`);
                    console.log(`   Program: ${entry.program}`);
                    console.log(`   Plist: ${entry.plistPath}`);
                });
            } else {
                console.log('   No Up4evr auto-start entries found');
            }
        } catch (error) {
            console.log(`❌ Could not list auto-start entries: ${error.message}`);
        }
        console.log('');

        // Test application start/stop functionality  
        console.log('⚡ Testing Application Control...');
        try {
            // Test starting an application
            console.log('Testing application start (dry run - not actually starting)...');
            console.log(`✅ Would start application: ${testAppPath}`);
            
            // Show what the start command would look like
            console.log(`   Command would be: open "${testAppPath}"`);
            
            // Test the application running detection
            const runningApps = await manager.getRunningApplications();
            const textEditRunning = runningApps.find(app => app.name === 'TextEdit');
            
            if (textEditRunning) {
                console.log(`🟢 TextEdit is currently running (PID: ${textEditRunning.pid})`);
            } else {
                console.log(`🟡 TextEdit is not currently running`);
            }
            
        } catch (error) {
            console.log(`❌ Could not test application control: ${error.message}`);
        }
        console.log('');

        console.log('✅ Process Manager test completed successfully!');
        console.log('');
        console.log('💡 To create an auto-start entry for real, you can run:');
        console.log('   const result = await manager.createAutoStartEntry("/path/to/your/app.app");');
        console.log('   console.log(result);');
        console.log('');
        console.log('🔧 Available methods:');
        console.log('   - startApplication() - Start an application');
        console.log('   - stopApplication() - Stop a running application');
        console.log('   - restartApplication() - Restart an application');
        console.log('   - getRunningApplications() - List running applications');
        console.log('   - createAutoStartEntry() - Create launch agent for auto-start');
        console.log('   - removeAutoStartEntry() - Remove auto-start launch agent');
        console.log('   - getAutoStartEntries() - List all Up4evr auto-start entries');
        console.log('   - generateLaunchAgentPlist() - Generate plist content');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        // Clean shutdown
        await platform.shutdown();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testLaunchAgents();
}

module.exports = testLaunchAgents;