#!/usr/bin/env node

/**
 * Test script for Profiles Manager
 * Run with: node backend/test-profiles.js
 */

const ProfilesManager = require('./modules/profiles');
const path = require('path');

async function testProfiles() {
    console.log('📁 Testing Profiles Manager\n');
    
    const manager = new ProfilesManager();
    
    try {
        // Create built-in templates
        console.log('🏗️  Creating Built-in Templates...');
        const templateResults = await manager.createBuiltInTemplates();
        console.log(`Created ${templateResults.filter(r => r.success).length} templates`);
        
        templateResults.forEach(result => {
            if (result.success) {
                console.log(`✅ ${result.profile.name} (${result.profile.category})`);
            } else {
                console.log(`❌ Failed to create ${result.template}: ${result.error}`);
            }
        });
        console.log('');

        // List built-in templates
        console.log('📋 Built-in Templates:');
        const templates = await manager.getBuiltInTemplates();
        templates.forEach(template => {
            console.log(`🏛️  ${template.name}`);
            console.log(`   Category: ${template.category}`);
            console.log(`   Settings: ${template.systemSettings.length} system, ${template.launchAgents.length} agents`);
            console.log(`   Tags: ${template.tags.join(', ')}`);
            console.log(`   Description: ${template.description}`);
        });
        console.log('');

        // Create a custom profile
        console.log('🎨 Creating Custom Profile...');
        const customProfile = manager.createProfile({
            name: 'My Custom Installation',
            description: 'Test installation profile for development',
            category: 'custom',
            author: 'Test User',
            systemSettings: [
                { id: 'screensaver', enabled: true },
                { id: 'displaySleep', enabled: true },
                { id: 'desktopBackground', enabled: false }
            ],
            launchAgents: [
                {
                    name: 'Test App',
                    appPath: '/Applications/TextEdit.app',
                    keepAlive: true,
                    successfulExit: true,
                    runAtLoad: true
                }
            ],
            tags: ['test', 'development', 'custom']
        });

        console.log(`✅ Created profile: ${customProfile.name}`);
        console.log(`   ID: ${customProfile.id}`);
        console.log(`   Settings: ${customProfile.systemSettings.length} configured`);
        console.log(`   Launch Agents: ${customProfile.launchAgents.length} configured`);
        console.log('');

        // Save the custom profile
        console.log('💾 Saving Custom Profile...');
        const saveResult = await manager.saveProfile(customProfile);
        console.log(`✅ Saved to: ${saveResult.fileName}`);
        console.log('');

        // List all profiles
        console.log('📂 All Saved Profiles:');
        const allProfiles = await manager.listProfiles();
        allProfiles.forEach(profile => {
            console.log(`📄 ${profile.name} (${profile.category})`);
            console.log(`   Created: ${new Date(profile.created).toLocaleDateString()}`);
            console.log(`   Author: ${profile.author}`);
            console.log(`   Configuration: ${profile.systemSettingsCount} settings, ${profile.launchAgentsCount} agents`);
        });
        console.log('');

        // Test loading a profile
        console.log('📖 Testing Profile Loading...');
        const loadResult = await manager.loadProfile(customProfile.id);
        if (loadResult.success) {
            const loaded = loadResult.profile;
            console.log(`✅ Loaded: ${loaded.name}`);
            console.log(`   System Settings: ${loaded.systemSettings.length}`);
            console.log(`   Launch Agents: ${loaded.launchAgents.length}`);
            
            // Show enabled settings
            const enabledSettings = loaded.systemSettings.filter(s => s.enabled);
            console.log(`   Enabled Settings: ${enabledSettings.map(s => s.id).join(', ')}`);
        }
        console.log('');

        // Test search functionality
        console.log('🔍 Testing Profile Search...');
        
        const museumProfiles = await manager.searchProfiles({ category: 'museum' });
        console.log(`Museum profiles: ${museumProfiles.length}`);
        
        const testProfiles = await manager.searchProfiles({ 
            tags: ['test', 'development'] 
        });
        console.log(`Profiles with test/development tags: ${testProfiles.length}`);
        
        const searchResults = await manager.searchProfiles({ 
            search: 'installation' 
        });
        console.log(`Profiles containing "installation": ${searchResults.length}`);
        console.log('');

        // Test duplicate functionality
        console.log('📋 Testing Profile Duplication...');
        const duplicateResult = await manager.duplicateProfile(
            customProfile.id, 
            'My Custom Installation (Copy)'
        );
        console.log(`✅ Duplicated profile: ${duplicateResult.profile.name}`);
        console.log(`   New ID: ${duplicateResult.profile.id}`);
        console.log('');

        // Show final profile count
        const finalProfiles = await manager.listProfiles();
        console.log(`📊 Total profiles: ${finalProfiles.length}`);
        
        // Show categories
        const categories = [...new Set(finalProfiles.map(p => p.category))];
        console.log(`📁 Categories: ${categories.join(', ')}`);
        console.log('');

        console.log('✅ Profiles Manager test completed successfully!');
        console.log('');
        console.log('💡 Available methods:');
        console.log('   - createProfile() - Create new profile');
        console.log('   - saveProfile() - Save to disk');
        console.log('   - loadProfile() - Load from disk');
        console.log('   - listProfiles() - List all profiles');
        console.log('   - searchProfiles() - Search by criteria');
        console.log('   - duplicateProfile() - Copy existing profile');
        console.log('   - exportProfile() - Export for sharing');
        console.log('   - importProfile() - Import shared profile');
        console.log('   - deleteProfile() - Remove profile');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testProfiles();
}

module.exports = testProfiles;