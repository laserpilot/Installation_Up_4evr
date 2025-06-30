#!/usr/bin/env node

/**
 * Test script for Configuration Profiles Manager (Platform Architecture)
 * Run with: node backend/test-profiles.js
 */

const PlatformManager = require('./src/core/platform-manager');
const path = require('path');

async function testProfiles() {
    console.log('📁 Testing Configuration Profiles Manager (Platform Architecture)\n');
    
    const platform = new PlatformManager();
    await platform.initialize();
    const manager = platform.profiles;
    
    try {
        // List all profiles (built-in and custom)
        console.log('📋 Available Profiles:');
        const allProfiles = await manager.listProfiles();
        console.log(`Found ${allProfiles.length} profiles:`);
        
        allProfiles.forEach(profile => {
            const type = profile.builtIn ? '🏛️  Built-in' : '🎨 Custom';
            const modified = profile.modified ? new Date(profile.modified).toLocaleDateString() : 'N/A';
            console.log(`${type} - ${profile.name} (${profile.category})`);
            console.log(`   Description: ${profile.description}`);
            console.log(`   Version: ${profile.version}`);
            if (!profile.builtIn) {
                console.log(`   Modified: ${modified}`);
            }
        });
        console.log('');

        // Create a custom profile using the new API
        console.log('🎨 Creating Custom Profile...');
        const customSettings = {
            systemPreferences: {
                screensaver: 'never',
                displaySleep: 'never',
                computerSleep: 'never',
                autoRestart: 'disabled'
            },
            monitoring: {
                thresholds: {
                    cpu: { warning: 75, critical: 90 },
                    memory: { warning: 80, critical: 95 }
                },
                interval: 30000,
                applications: [
                    {
                        name: 'TextEdit',
                        path: '/Applications/TextEdit.app',
                        shouldBeRunning: false
                    }
                ]
            },
            userPreferences: {
                showTooltips: true,
                confirmActions: false
            }
        };

        const customProfileName = 'My Custom Installation';
        const customProfileDescription = 'Test installation profile for development';
        
        console.log(`✅ Profile configuration prepared: ${customProfileName}`);
        console.log(`   Description: ${customProfileDescription}`);
        console.log(`   Settings categories: ${Object.keys(customSettings).join(', ')}`);
        console.log('');

        // Save the custom profile
        console.log('💾 Saving Custom Profile...');
        const saveResult = await manager.saveProfile(
            customProfileName,
            customProfileDescription,
            customSettings,
            { category: 'custom' }
        );
        const customProfileId = saveResult.profileId;
        console.log(`✅ Saved profile: ${customProfileName}`);
        console.log(`   ID: ${customProfileId}`);
        console.log(`   Path: ${saveResult.path}`);
        console.log('');

        // List all profiles again to see the new one
        console.log('📂 Updated Profile List:');
        const updatedProfiles = await manager.listProfiles();
        console.log(`Total profiles: ${updatedProfiles.length}`);
        updatedProfiles.forEach(profile => {
            const type = profile.builtIn ? '🏛️  Built-in' : '🎨 Custom';
            const created = profile.created ? new Date(profile.created).toLocaleDateString() : 'N/A';
            console.log(`${type} - ${profile.name} (${profile.category})`);
            if (!profile.builtIn) {
                console.log(`   Created: ${created}`);
            }
        });
        console.log('');

        // Test loading a profile
        console.log('📖 Testing Profile Loading...');
        const loadedProfile = await manager.getProfile(customProfileId);
        console.log(`✅ Loaded: ${loadedProfile.name}`);
        console.log(`   Description: ${loadedProfile.description}`);
        console.log(`   Settings categories: ${Object.keys(loadedProfile.settings).join(', ')}`);
        console.log(`   System preferences: ${Object.keys(loadedProfile.settings.systemPreferences).join(', ')}`);
        console.log(`   Monitoring apps: ${loadedProfile.settings.monitoring.applications.length}`);
        console.log('');

        // Test profile stats
        console.log('🔍 Testing Profile Statistics...');
        const stats = await manager.getProfileStats();
        console.log(`Profile statistics:`);
        console.log(`   Total profiles: ${stats.total}`);
        console.log(`   Built-in profiles: ${stats.builtIn}`);
        console.log(`   Custom profiles: ${stats.custom}`);
        const categoriesArray = Array.isArray(stats.categories) ? stats.categories : Object.keys(stats.categories || {});
        console.log(`   Categories: ${categoriesArray.join(', ')}`);
        console.log('');

        // Test creating profile from current config
        console.log('📋 Testing Profile Creation from Current Config...');
        const currentConfigProfile = await manager.createProfileFromCurrentConfig(
            'Current System Profile',
            'Profile created from current system configuration'
        );
        console.log(`✅ Created profile from current config: ${currentConfigProfile.name}`);
        console.log(`   ID: ${currentConfigProfile.id}`);
        console.log('');

        // Show final profile count
        const finalProfiles = await manager.listProfiles();
        console.log(`📊 Final Profile Count: ${finalProfiles.length}`);
        
        // Show categories
        const categories = [...new Set(finalProfiles.map(p => p.category))];
        console.log(`📁 Categories: ${categories.join(', ')}`);
        console.log('');

        console.log('✅ Configuration Profiles Manager test completed successfully!');
        console.log('');
        console.log('💡 Available methods:');
        console.log('   - listProfiles() - List all profiles (built-in and custom)');
        console.log('   - getProfile(id) - Get specific profile by ID');
        console.log('   - saveProfile(name, description, settings, options) - Save new profile');
        console.log('   - loadProfile(id, options) - Load and apply profile settings');
        console.log('   - deleteProfile(id) - Remove custom profile');
        console.log('   - exportProfile(id, path) - Export profile for sharing');
        console.log('   - importProfile(path) - Import shared profile');
        console.log('   - createProfileFromCurrentConfig(name, description) - Create from current state');
        console.log('   - getProfileStats() - Get profile statistics');
        console.log('   - applyProfileSettings(settings) - Apply settings to system');

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
    testProfiles();
}

module.exports = testProfiles;