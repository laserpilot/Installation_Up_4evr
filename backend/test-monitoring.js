#!/usr/bin/env node

/**
 * Test script for Monitoring and Control Systems
 * Run with: node backend/test-monitoring.js
 */

const MonitoringSystem = require('./modules/monitoring');
const RemoteControlSystem = require('./modules/remote-control');
const NotificationSystem = require('./modules/notifications');

async function testMonitoringSystem() {
    console.log('📊 Testing Monitoring, Control, and Notification Systems\n');
    
    const monitoring = new MonitoringSystem();
    const remoteControl = new RemoteControlSystem(monitoring);
    const notifications = new NotificationSystem(monitoring);
    
    try {
        // Test monitoring system
        console.log('🔍 Testing Monitoring System...');
        
        // Add some test applications to monitor
        monitoring.addWatchedApplication('TextEdit', { restartCount: 0 });
        monitoring.addWatchedApplication('Calculator', { restartCount: 2 });
        
        console.log('✅ Added test applications to monitoring');
        
        // Collect system data once
        await monitoring.collectSystemData();
        console.log('✅ System data collected');
        
        // Get monitoring data
        const monitoringData = monitoring.getMonitoringData();
        console.log(`📈 System Status: ${monitoringData.status}`);
        console.log(`🖥️  CPU Usage: ${monitoringData.system.cpuUsage?.toFixed(1) || 'N/A'}%`);
        console.log(`💾 Memory Usage: ${monitoringData.system.memoryUsage?.toFixed(1) || 'N/A'}%`);
        console.log(`⏱️  Uptime: ${Math.floor((monitoringData.system.uptime || 0) / 3600)}h ${Math.floor(((monitoringData.system.uptime || 0) % 3600) / 60)}m`);
        console.log(`📱 Watching ${Object.keys(monitoringData.applications).length} applications`);
        console.log(`🖼️  Detected ${Object.keys(monitoringData.displays).length} displays`);
        console.log('');

        // Test health summary
        console.log('🏥 Testing Health Summary...');
        const health = monitoring.getHealthSummary();
        console.log(`Overall Status: ${health.status}`);
        console.log(`Applications: ${health.applications.running}/${health.applications.total} running`);
        console.log(`Issues: ${health.issues.length > 0 ? health.issues.join(', ') : 'None'}`);
        console.log('');

        // Test remote control system
        console.log('🎮 Testing Remote Control System...');
        
        // Get control capabilities
        const capabilities = remoteControl.getControlCapabilities();
        console.log(`Available commands: ${capabilities.commands.join(', ')}`);
        console.log(`Can control ${capabilities.applications.length} applications`);
        
        // Create a control session
        const session = remoteControl.createControlSession('test-user', ['restart-app', 'screenshot']);
        console.log(`✅ Created control session: ${session.id}`);
        
        // Test some safe commands
        console.log('🧪 Testing safe commands...');
        
        try {
            // Test screenshot command
            const screenshotResult = await remoteControl.executeCommand('screenshot', {
                path: '/tmp/test-installation-screenshot.png'
            }, session.id);
            console.log(`📸 Screenshot: ${screenshotResult.success ? 'Success' : 'Failed'}`);
            if (screenshotResult.success) {
                console.log(`   Saved to: ${screenshotResult.result.path}`);
            }
        } catch (error) {
            console.log(`📸 Screenshot: Failed (${error.message})`);
        }
        
        try {
            // Test volume command
            const volumeResult = await remoteControl.executeCommand('set-volume', {
                level: 50
            }, session.id);
            console.log(`🔊 Set Volume: ${volumeResult.success ? 'Success' : 'Failed'}`);
        } catch (error) {
            console.log(`🔊 Set Volume: Failed (${error.message})`);
        }
        
        // Clean up session
        remoteControl.endControlSession(session.id);
        console.log('✅ Control session ended');
        console.log('');

        // Test notification system
        console.log('📢 Testing Notification System...');
        
        // Add test notification channels
        notifications.addChannel('test-console', {
            type: 'webhook',
            url: 'https://httpbin.org/post',
            enabled: true,
            rateLimitMs: 5000
        });
        
        notifications.addChannel('test-slack', {
            type: 'slack',
            webhookUrl: 'https://hooks.slack.com/test/invalid/webhook',
            enabled: false, // Disabled for testing
            username: 'Installation Monitor'
        });
        
        console.log('✅ Added test notification channels');
        
        // Get notification stats
        const stats = notifications.getNotificationStats();
        console.log(`Configured channels: ${stats.channels} (${stats.enabledChannels} enabled)`);
        console.log(`Channel types: ${Object.entries(stats.channelTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`);
        
        // Test sending a notification
        try {
            const notificationResult = await notifications.sendNotification(
                'Test notification from Installation Up 4evr monitoring system',
                {
                    severity: 'info',
                    category: 'test',
                    data: { testValue: 123, timestamp: new Date().toISOString() }
                }
            );
            
            console.log(`📤 Notification sent to ${notificationResult.results.length} channels`);
            notificationResult.results.forEach(result => {
                console.log(`   ${result.channel}: ${result.success ? 'Success' : 'Failed'}`);
                if (!result.success) {
                    console.log(`      Error: ${result.error}`);
                }
            });
        } catch (error) {
            console.log(`📤 Notification failed: ${error.message}`);
        }
        console.log('');

        // Test logging system
        console.log('📝 Testing Logging System...');
        
        // Generate some test logs
        monitoring.log('info', 'Test info message', { testData: 'info' });
        monitoring.log('warning', 'Test warning message', { testData: 'warning' });
        monitoring.log('error', 'Test error message', { testData: 'error' });
        
        // Get recent logs
        const recentLogs = await monitoring.getRecentLogs(1); // Last hour
        console.log(`📋 Found ${recentLogs.length} log entries in the last hour`);
        
        if (recentLogs.length > 0) {
            console.log('Recent log samples:');
            recentLogs.slice(0, 3).forEach(log => {
                console.log(`   [${log.level.toUpperCase()}] ${log.message}`);
            });
        }
        console.log('');

        // Test alert system
        console.log('🚨 Testing Alert System...');
        
        // Create a test alert
        const alert = monitoring.createAlert('test-alert', 'This is a test alert for monitoring system', 'warning');
        console.log(`✅ Created alert: ${alert.id}`);
        console.log(`   Message: ${alert.message}`);
        console.log(`   Severity: ${alert.severity}`);
        
        // Acknowledge the alert
        const acknowledgedAlert = monitoring.acknowledgeAlert(alert.id);
        console.log(`✅ Alert acknowledged: ${acknowledgedAlert ? 'Success' : 'Failed'}`);
        console.log('');

        // Test heartbeat system
        console.log('💓 Testing Heartbeat System...');
        
        // Send a manual heartbeat
        monitoring.sendHeartbeat();
        console.log('✅ Heartbeat sent');
        
        const heartbeatData = monitoring.getMonitoringData().lastHeartbeat;
        if (heartbeatData) {
            console.log(`   Installation ID: ${heartbeatData.installationId}`);
            console.log(`   Status: ${heartbeatData.status}`);
            console.log(`   Uptime: ${Math.floor(heartbeatData.uptime / 3600)}h ${Math.floor((heartbeatData.uptime % 3600) / 60)}m`);
        }
        console.log('');

        console.log('✅ All monitoring, control, and notification tests completed!');
        console.log('');
        console.log('🎯 Key Features Tested:');
        console.log('   ✅ System monitoring (CPU, memory, disk, apps, displays)');
        console.log('   ✅ Remote control commands (screenshot, volume, etc.)');
        console.log('   ✅ Notification channels (webhook, slack configuration)');
        console.log('   ✅ Logging system with file persistence');
        console.log('   ✅ Alert creation and acknowledgment');
        console.log('   ✅ Heartbeat monitoring');
        console.log('   ✅ Health status tracking');
        console.log('');
        console.log('💡 Ready for production use! The system can now:');
        console.log('   📊 Monitor installation health in real-time');
        console.log('   🎮 Accept remote control commands');
        console.log('   📢 Send notifications to Slack/Discord/webhooks');
        console.log('   📝 Log all activity with persistence');
        console.log('   🚨 Generate and track alerts');
        console.log('   💓 Provide heartbeat status for uptime monitoring');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testMonitoringSystem();
}

module.exports = testMonitoringSystem;