#!/usr/bin/env node

/**
 * Test script for System Preferences Manager
 * Run with: node backend/test-system-prefs.js
 */

const SystemPreferencesManager = require('./modules/system-prefs');

async function testSystemPrefs() {
    console.log('🔧 Testing System Preferences Manager\n');
    
    const manager = new SystemPreferencesManager();
    
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
        console.log(`Total settings: ${allSettings.length}`);
        
        const requiredSettings = manager.getRequiredSettings();
        console.log(`Required settings: ${requiredSettings.length}`);
        
        const optionalSettings = manager.getOptionalSettings();
        console.log(`Optional settings: ${optionalSettings.length}`);
        console.log('');

        // List all settings
        console.log('📋 Settings List:');
        allSettings.forEach(setting => {
            const type = setting.required ? '🔴 Required' : '🟡 Optional';
            console.log(`${type} - ${setting.name}: ${setting.description}`);
        });
        console.log('');

        // Verify current settings without applying them
        console.log('🔍 Verifying Current Settings (read-only):');
        const verificationResults = await manager.verifyAllSettings();
        
        verificationResults.forEach(result => {
            const status = result.verified ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
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
        const report = await manager.generateSystemReport();
        console.log(`Report generated for: ${report.hostname}`);
        console.log(`Platform: ${report.platform} ${report.release}`);
        console.log(`Timestamp: ${report.timestamp}`);
        console.log('');

        // Export profile
        console.log('💾 Exporting Current Profile...');
        const profile = await manager.exportProfile('test-profile');
        console.log(`Profile "${profile.name}" created with ${profile.settings.length} settings`);
        console.log('');

        console.log('✅ System Preferences Manager test completed successfully!');
        console.log('');
        console.log('💡 To apply settings, you can run:');
        console.log('   manager.applyRequiredSettings() - Apply all required settings');
        console.log('   manager.applySetting("screensaver") - Apply specific setting');
        console.log('   manager.applyAllSettings() - Apply all settings');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testSystemPrefs();
}

module.exports = testSystemPrefs;