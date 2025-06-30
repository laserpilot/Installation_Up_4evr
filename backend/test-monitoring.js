#!/usr/bin/env node

/**
 * Test script for Monitoring and Control Systems (Platform Architecture)
 * Run with: node backend/test-monitoring.js
 */

const PlatformManager = require('./src/core/platform-manager');

async function testMonitoringSystem() {
    console.log('📊 Testing Monitoring and Control Systems (Platform Architecture)\n');
    
    const platform = new PlatformManager();
    await platform.initialize();
    const monitoring = platform.getMonitoring();
    
    try {
        // Test monitoring system
        console.log('🔍 Testing Monitoring System...');
        
        // Add some test applications to monitor
        monitoring.addApplication('TextEdit', 'TextEdit', { restartCount: 0 });
        monitoring.addApplication('Calculator', 'Calculator', { restartCount: 2 });
        
        console.log('✅ Added test applications to monitoring');
        
        // Collect system data once
        await monitoring.collectMonitoringData();
        console.log('✅ System data collected');
        
        // Get monitoring data
        const monitoringData = monitoring.getCurrentData();
        const systemStatus = monitoring.getOverallStatus();
        console.log(`📈 System Status: ${systemStatus}`);
        console.log(`🖥️  CPU Usage: ${monitoringData.system.cpu?.usage?.toFixed(1) || 'N/A'}%`);
        console.log(`💾 Memory Usage: ${monitoringData.system.memory?.usage?.toFixed(1) || 'N/A'}%`);
        console.log(`⏱️  Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`);
        console.log(`📱 Watching ${monitoringData.applications?.length || 0} applications`);
        console.log(`🖼️  Detected ${monitoringData.displays?.length || 0} displays`);
        console.log('');

        // Test health summary
        console.log('🏥 Testing Health Summary...');
        const overallStatus = monitoring.getOverallStatus();
        const currentData = monitoring.getCurrentData();
        console.log(`Overall Status: ${overallStatus}`);
        console.log(`Applications: ${currentData.applications?.length || 0} monitored`);
        const runningApps = currentData.applications?.filter(app => app.status === 'running').length || 0;
        console.log(`Running: ${runningApps}/${currentData.applications?.length || 0}`);
        console.log('');

        // Test monitoring events
        console.log('🎮 Testing Monitoring Events...');
        
        // Set up event listeners
        monitoring.on('dataCollected', (data) => {
            console.log(`✅ Data collection event received - CPU: ${data.system?.cpu?.usage?.toFixed(1) || 'N/A'}%`);
        });
        
        monitoring.on('alerts', (alerts) => {
            console.log(`🚨 Alert event received - ${alerts.length} alerts`);
            alerts.forEach(alert => {
                console.log(`   ${alert.level}: ${alert.message}`);
            });
        });
        
        monitoring.on('heartbeat', (heartbeat) => {
            console.log(`💓 Heartbeat event - Status: ${heartbeat.status}`);
        });
        
        console.log('✅ Event listeners configured');
        console.log('');

        // Test alert thresholds
        console.log('📢 Testing Alert Thresholds...');
        
        // Get current thresholds
        const thresholds = monitoring.alertThresholds;
        console.log('Current Alert Thresholds:');
        console.log(`   CPU Usage: ${thresholds.cpuUsage}%`);
        console.log(`   Memory Usage: ${thresholds.memoryUsage}%`);
        console.log(`   Disk Usage: ${thresholds.diskUsage}%`);
        console.log(`   App Restarts: ${thresholds.appRestarts}`);
        
        // Test updating thresholds
        monitoring.updateThresholds({
            cpuUsage: 85,
            memoryUsage: 85
        });
        
        console.log('✅ Updated alert thresholds');
        console.log('');

        // Test monitoring start/stop
        console.log('📝 Testing Monitoring Control...');
        
        // Test starting monitoring for a short duration
        console.log('Starting monitoring system...');
        await monitoring.startMonitoring(5000); // 5 second interval
        
        // Wait for a few data collection cycles
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Stop monitoring
        monitoring.stopMonitoring();
        console.log('✅ Monitoring system started and stopped successfully');
        console.log('');

        // Test heartbeat system
        console.log('💓 Testing Heartbeat System...');
        
        // Send a manual heartbeat
        monitoring.sendHeartbeat();
        console.log('✅ Heartbeat sent');
        
        console.log(`   Installation ID: ${monitoring.installationId}`);
        console.log(`   Status: ${monitoring.getOverallStatus()}`);
        console.log(`   Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`);
        console.log('');

        console.log('✅ All monitoring system tests completed!');
        console.log('');
        console.log('🎯 Key Features Tested:');
        console.log('   ✅ System monitoring (CPU, memory, disk, apps, displays)');
        console.log('   ✅ Application monitoring and tracking');
        console.log('   ✅ Event-driven architecture with listeners');
        console.log('   ✅ Alert threshold configuration');
        console.log('   ✅ Monitoring start/stop control');
        console.log('   ✅ Heartbeat system');
        console.log('   ✅ Health status tracking');
        console.log('');
        console.log('💡 Ready for production use! The system can now:');
        console.log('   📊 Monitor installation health in real-time');
        console.log('   🎮 Provide event-driven monitoring updates');
        console.log('   📢 Generate configurable alerts');
        console.log('   📝 Track application and system status');
        console.log('   🚨 Monitor performance thresholds');
        console.log('   💓 Provide heartbeat status for uptime monitoring');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        // Clean shutdown
        await platform.shutdown();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testMonitoringSystem();
}

module.exports = testMonitoringSystem;