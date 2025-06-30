#!/usr/bin/env node

/**
 * Test script for System Preferences Manager (Platform Architecture)
 * Run with: node backend/test-system-prefs.js
 */

const PlatformManager = require('./src/core/platform-manager');

async function testSystemPrefs() {
    console.log('🔧 Testing System Preferences Manager (Platform Architecture)\n');
    
    const platform = new PlatformManager();
    await platform.initialize();
    const manager = platform.getSystemManager();
    
    try {
        // Check SIP status first
        console.log('📋 Checking System Integrity Protection (SIP) status...');
        const sipStatus = await manager.checkSIPStatus();
        console.log(`SIP Status: ${sipStatus.status}`);
        if (sipStatus.warning) {
            console.log(`⚠️  Warning: ${sipStatus.warning}`);
        }
        console.log('');

        // Get all settings
        console.log('📝 Available Settings:');
        const allSettings = manager.getSettings();
        const allSettingsArray = Object.values(allSettings);
        console.log(`Total settings: ${allSettingsArray.length}`);
        
        const requiredSettings = manager.getRequiredSettings();
        const requiredSettingsArray = Object.values(requiredSettings);
        console.log(`Required settings: ${requiredSettingsArray.length}`);
        
        const optionalSettings = manager.getOptionalSettings();
        const optionalSettingsArray = Object.values(optionalSettings);
        console.log(`Optional settings: ${optionalSettingsArray.length}`);
        console.log('');

        // List all settings
        console.log('📋 Settings List:');
        allSettingsArray.forEach(setting => {
            const type = setting.required ? '🔴 Required' : '🟡 Optional';
            console.log(`${type} - ${setting.name}: ${setting.description}`);
        });
        console.log('');

        // Check current settings status without applying them
        console.log('🔍 Checking Current Settings Status (read-only):');
        const statusResults = await manager.checkAllSettingsStatus();
        
        statusResults.forEach(result => {
            console.log(`${result.statusIcon} ${result.name} - ${result.statusText}`);
            if (result.output) {
                console.log(`   Current value: ${result.output}`);
            }
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        console.log('');

        // Generate system report
        console.log('📊 Generating System Report...');
        const systemInfo = await manager.getSystemInfo();
        console.log(`Report generated for: ${systemInfo.hostName}`);
        console.log(`Platform: ${systemInfo.platform} ${systemInfo.version}`);
        console.log(`Computer Name: ${systemInfo.computerName}`);
        console.log(`Architecture: ${systemInfo.arch}`);
        console.log('');

        // Show settings configuration  
        console.log('💾 Current Settings Configuration...');
        const settingsConfig = {
            name: 'test-profile',
            timestamp: new Date().toISOString(),
            platform: systemInfo.platform,
            settings: allSettings
        };
        console.log(`Configuration "${settingsConfig.name}" contains ${Object.keys(settingsConfig.settings).length} settings`);
        console.log('');

        console.log('✅ System Preferences Manager test completed successfully!');
        console.log('');
        console.log('💡 To apply settings, you can run:');
        console.log('   manager.applyRequiredSettings() - Apply all required settings');
        console.log('   manager.applySettings(["screensaver"]) - Apply specific settings');
        console.log('   manager.applySettings(Object.keys(allSettings)) - Apply all settings');

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
    testSystemPrefs();
}

module.exports = testSystemPrefs;