/**
 * Test Strategy 1 - Command-specific sudo implementation
 */

const MacOSSystemManager = require('./backend/src/platform/macos/system-manager.js');

async function testCommandSpecificSudo() {
    console.log('=== Testing Strategy 1: Command-Specific Sudo ===\n');
    
    const systemManager = new MacOSSystemManager();
    
    // Test 1: Apply a non-sudo setting first
    console.log('Test 1: Applying non-sudo setting (screensaver)...');
    try {
        const result = await systemManager.applySettings(['screensaver']);
        console.log('✅ Screensaver result:', result);
    } catch (error) {
        console.error('❌ Screensaver failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Apply a sudo setting
    console.log('Test 2: Applying sudo setting (displaySleep)...');
    console.log('⚠️  This should show a native macOS authentication dialog');
    try {
        const result = await systemManager.applySettings(['displaySleep']);
        console.log('✅ Display Sleep result:', result);
    } catch (error) {
        console.error('❌ Display Sleep failed:', error.message);
    }
    
    console.log('\n=== Test Complete ===');
}

// Run the test
testCommandSpecificSudo().catch(console.error);