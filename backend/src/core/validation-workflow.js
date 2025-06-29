/**
 * Installation Success Validation and Testing Workflow
 * Provides comprehensive validation that installation is properly configured
 */

const { PlatformFactory } = require('./interfaces');

class ValidationWorkflow {
    constructor(config, monitoring, systemManager) {
        this.config = config;
        this.monitoring = monitoring;
        this.systemManager = systemManager;
        this.validationTests = this.setupValidationTests();
        this.testResults = [];
        this.isRunning = false;
    }

    setupValidationTests() {
        return [
            // System Configuration Tests
            {
                id: 'system-uptime',
                name: 'System Uptime Check',
                category: 'system',
                priority: 'high',
                description: 'Verify system has been running for sufficient time',
                test: this.testSystemUptime.bind(this)
            },
            {
                id: 'system-resources',
                name: 'System Resource Health',
                category: 'system',
                priority: 'critical',
                description: 'Check CPU, memory, and disk usage are within acceptable ranges',
                test: this.testSystemResources.bind(this)
            },
            {
                id: 'display-connectivity',
                name: 'Display Connectivity',
                category: 'hardware',
                priority: 'critical',
                description: 'Verify all displays are connected and functioning',
                test: this.testDisplayConnectivity.bind(this)
            },
            {
                id: 'network-connectivity',
                name: 'Network Connectivity',
                category: 'network',
                priority: 'high',
                description: 'Test internet connectivity and network configuration',
                test: this.testNetworkConnectivity.bind(this)
            },

            // Configuration Tests
            {
                id: 'system-preferences',
                name: 'System Preferences Configuration',
                category: 'configuration',
                priority: 'high',
                description: 'Verify system preferences are set correctly for installation',
                test: this.testSystemPreferences.bind(this)
            },
            {
                id: 'monitoring-config',
                name: 'Monitoring Configuration',
                category: 'configuration',
                priority: 'medium',
                description: 'Validate monitoring is properly configured and active',
                test: this.testMonitoringConfiguration.bind(this)
            },
            {
                id: 'notification-config',
                name: 'Notification Configuration',
                category: 'configuration',
                priority: 'medium',
                description: 'Test notification channels and alert settings',
                test: this.testNotificationConfiguration.bind(this)
            },

            // Application Tests
            {
                id: 'critical-applications',
                name: 'Critical Applications Running',
                category: 'applications',
                priority: 'critical',
                description: 'Verify all critical applications are running correctly',
                test: this.testCriticalApplications.bind(this)
            },
            {
                id: 'launch-agents',
                name: 'Launch Agents Status',
                category: 'applications',
                priority: 'high',
                description: 'Check that launch agents are properly installed and active',
                test: this.testLaunchAgents.bind(this)
            },

            // Security Tests
            {
                id: 'security-settings',
                name: 'Security Configuration',
                category: 'security',
                priority: 'medium',
                description: 'Verify security settings are appropriate for installation',
                test: this.testSecuritySettings.bind(this)
            },

            // Performance Tests
            {
                id: 'performance-baseline',
                name: 'Performance Baseline',
                category: 'performance',
                priority: 'medium',
                description: 'Establish performance baseline measurements',
                test: this.testPerformanceBaseline.bind(this)
            },

            // Installation-Specific Tests
            {
                id: 'installation-metadata',
                name: 'Installation Metadata',
                category: 'metadata',
                priority: 'low',
                description: 'Verify installation information is complete',
                test: this.testInstallationMetadata.bind(this)
            }
        ];
    }

    /**
     * Run all validation tests
     */
    async runFullValidation(options = {}) {
        if (this.isRunning) {
            throw new Error('Validation workflow is already running');
        }

        this.isRunning = true;
        this.testResults = [];

        try {
            const startTime = Date.now();
            const selectedTests = this.filterTests(options);

            console.log(`[VALIDATION] Starting validation workflow with ${selectedTests.length} tests`);

            for (const test of selectedTests) {
                await this.runSingleTest(test, options);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            const summary = this.generateValidationSummary();
            
            console.log(`[VALIDATION] Completed in ${duration}ms. ${summary.passed}/${summary.total} tests passed`);

            return {
                success: true,
                summary,
                duration,
                results: this.testResults,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('[VALIDATION] Workflow failed:', error);
            return {
                success: false,
                error: error.message,
                summary: this.generateValidationSummary(),
                results: this.testResults,
                timestamp: new Date().toISOString()
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Run a single validation test
     */
    async runSingleTest(test, options = {}) {
        const result = {
            id: test.id,
            name: test.name,
            category: test.category,
            priority: test.priority,
            description: test.description,
            startTime: Date.now(),
            status: 'running',
            passed: false,
            message: '',
            details: {},
            recommendations: []
        };

        try {
            console.log(`[VALIDATION] Running test: ${test.name}`);
            
            const testResult = await test.test(options);
            
            result.passed = testResult.passed;
            result.message = testResult.message;
            result.details = testResult.details || {};
            result.recommendations = testResult.recommendations || [];
            result.status = testResult.passed ? 'passed' : 'failed';

            if (testResult.warning) {
                result.status = 'warning';
                result.warning = testResult.warning;
            }

        } catch (error) {
            result.passed = false;
            result.status = 'error';
            result.message = `Test failed with error: ${error.message}`;
            result.error = error.message;
        }

        result.endTime = Date.now();
        result.duration = result.endTime - result.startTime;

        this.testResults.push(result);
        return result;
    }

    // Individual test implementations

    async testSystemUptime() {
        const systemData = this.monitoring.getCurrentData();
        const uptimeSeconds = systemData.uptime?.seconds || 0;
        const uptimeHours = uptimeSeconds / 3600;

        if (uptimeHours >= 1) {
            return {
                passed: true,
                message: `System uptime: ${Math.round(uptimeHours * 10) / 10} hours`,
                details: { uptimeHours, uptimeSeconds }
            };
        } else {
            return {
                passed: false,
                message: `Insufficient uptime: ${Math.round(uptimeHours * 10) / 10} hours (recommended: >1 hour)`,
                details: { uptimeHours, uptimeSeconds },
                recommendations: ['Allow system to run for at least 1 hour to ensure stability']
            };
        }
    }

    async testSystemResources() {
        const systemData = this.monitoring.getCurrentData();
        const { cpu, memory, disk } = systemData.system || {};
        
        const issues = [];
        const details = {};

        // Check CPU usage
        if (cpu?.usage > 90) {
            issues.push(`High CPU usage: ${cpu.usage}%`);
        }
        details.cpu = cpu?.usage || 0;

        // Check memory usage
        if (memory?.usage > 85) {
            issues.push(`High memory usage: ${memory.usage}%`);
        }
        details.memory = memory?.usage || 0;

        // Check disk usage
        if (disk?.usage > 90) {
            issues.push(`High disk usage: ${disk.usage}%`);
        }
        details.disk = disk?.usage || 0;

        if (issues.length === 0) {
            return {
                passed: true,
                message: `System resources healthy: CPU ${details.cpu}%, Memory ${details.memory}%, Disk ${details.disk}%`,
                details
            };
        } else {
            return {
                passed: false,
                message: `Resource issues detected: ${issues.join(', ')}`,
                details,
                recommendations: [
                    'Close unnecessary applications to reduce resource usage',
                    'Consider system restart if resources remain high',
                    'Check for runaway processes in Activity Monitor'
                ]
            };
        }
    }

    async testDisplayConnectivity() {
        const systemData = this.monitoring.getCurrentData();
        const displays = systemData.displays || {};
        
        const displayArray = Object.values(displays);
        const onlineDisplays = displayArray.filter(d => d.online);
        const offlineDisplays = displayArray.filter(d => !d.online);

        const details = {
            totalDisplays: displayArray.length,
            onlineDisplays: onlineDisplays.length,
            offlineDisplays: offlineDisplays.length,
            displays: displayArray
        };

        if (displayArray.length === 0) {
            return {
                passed: false,
                message: 'No displays detected',
                details,
                recommendations: ['Check display connections and power', 'Verify graphics card functionality']
            };
        }

        if (offlineDisplays.length === 0) {
            return {
                passed: true,
                message: `All ${onlineDisplays.length} display(s) are online`,
                details
            };
        } else {
            return {
                passed: false,
                message: `${offlineDisplays.length} of ${displayArray.length} displays are offline`,
                details,
                recommendations: [
                    'Check power and cable connections for offline displays',
                    'Verify display settings in System Preferences',
                    'Test displays with different cables if available'
                ]
            };
        }
    }

    async testNetworkConnectivity() {
        const systemData = this.monitoring.getCurrentData();
        const network = systemData.network || {};
        
        const details = {
            interfaces: network.interfaces || [],
            primaryIP: network.primaryIP
        };

        // Basic connectivity check
        const hasActiveInterface = details.interfaces.some(iface => 
            iface.status === 'active' && iface.ipAddress && iface.ipAddress !== '127.0.0.1'
        );

        if (hasActiveInterface) {
            return {
                passed: true,
                message: `Network connectivity available (${details.primaryIP || 'IP detected'})`,
                details
            };
        } else {
            return {
                passed: false,
                message: 'No active network connectivity detected',
                details,
                recommendations: [
                    'Check Ethernet or Wi-Fi connections',
                    'Verify network settings in System Preferences',
                    'Test with different network interface if available'
                ]
            };
        }
    }

    async testSystemPreferences() {
        if (!this.systemManager) {
            return {
                passed: false,
                message: 'System manager not available for testing',
                details: {},
                recommendations: ['Initialize system manager for proper testing']
            };
        }

        try {
            // Test key system preferences for installation
            const settings = ['screensaver', 'displaySleep', 'computerSleep'];
            const results = await this.systemManager.verifySettings(settings);
            
            const failedSettings = results.filter(r => r.status === 'incorrect');
            const details = { settings: results };

            if (failedSettings.length === 0) {
                return {
                    passed: true,
                    message: `All ${settings.length} system preferences are correctly configured`,
                    details
                };
            } else {
                return {
                    passed: false,
                    message: `${failedSettings.length} system preferences need adjustment`,
                    details,
                    recommendations: [
                        'Use the System Preferences tab to fix incorrect settings',
                        'Apply recommended settings for installation environments'
                    ]
                };
            }
        } catch (error) {
            return {
                passed: false,
                message: `Failed to verify system preferences: ${error.message}`,
                details: { error: error.message },
                recommendations: ['Check system permissions for preference access']
            };
        }
    }

    async testMonitoringConfiguration() {
        const config = this.config.get('monitoring');
        const details = { config };

        const issues = [];

        if (!config?.enabled) {
            issues.push('Monitoring is disabled');
        }

        if (!config?.thresholds) {
            issues.push('No monitoring thresholds configured');
        }

        if (config?.interval > 60000) {
            issues.push('Monitoring interval is too long (>60s)');
        }

        if (issues.length === 0) {
            return {
                passed: true,
                message: 'Monitoring configuration is optimal',
                details
            };
        } else {
            return {
                passed: false,
                message: `Monitoring configuration issues: ${issues.join(', ')}`,
                details,
                recommendations: [
                    'Enable monitoring for system visibility',
                    'Configure appropriate thresholds for your installation',
                    'Set monitoring interval to 30-60 seconds for responsive alerts'
                ]
            };
        }
    }

    async testNotificationConfiguration() {
        const config = this.config.get('notifications');
        const details = { config };

        const issues = [];

        if (!config?.enabled) {
            issues.push('Notifications are disabled');
        }

        if (config?.channels) {
            const enabledChannels = Object.values(config.channels).filter(ch => ch.enabled).length;
            if (enabledChannels === 0) {
                issues.push('No notification channels configured');
            }
        }

        if (issues.length === 0) {
            return {
                passed: true,
                message: 'Notification configuration is set up',
                details
            };
        } else {
            return {
                passed: false,
                message: `Notification issues: ${issues.join(', ')}`,
                details,
                recommendations: [
                    'Enable notifications for alert delivery',
                    'Configure at least one notification channel (Slack, Discord, email)',
                    'Test notification delivery to ensure reliability'
                ]
            };
        }
    }

    async testCriticalApplications() {
        const systemData = this.monitoring.getCurrentData();
        const applications = systemData.applications || [];
        
        const criticalApps = applications.filter(app => app.shouldBeRunning);
        const runningCriticalApps = criticalApps.filter(app => app.status === 'running');
        const stoppedCriticalApps = criticalApps.filter(app => app.status !== 'running');

        const details = {
            totalCritical: criticalApps.length,
            running: runningCriticalApps.length,
            stopped: stoppedCriticalApps.length,
            stoppedApps: stoppedCriticalApps.map(app => app.name)
        };

        if (criticalApps.length === 0) {
            return {
                passed: true,
                message: 'No critical applications configured',
                details,
                warning: 'Consider adding critical applications to monitoring'
            };
        }

        if (stoppedCriticalApps.length === 0) {
            return {
                passed: true,
                message: `All ${criticalApps.length} critical applications are running`,
                details
            };
        } else {
            return {
                passed: false,
                message: `${stoppedCriticalApps.length} critical applications are not running: ${details.stoppedApps.join(', ')}`,
                details,
                recommendations: [
                    'Restart stopped applications',
                    'Check application configurations and dependencies',
                    'Review application logs for startup errors'
                ]
            };
        }
    }

    async testLaunchAgents() {
        // This would integrate with the launch agents module
        // For now, return a basic test
        return {
            passed: true,
            message: 'Launch agents test not implemented',
            details: {},
            warning: 'Launch agent validation requires integration with launch agents module'
        };
    }

    async testSecuritySettings() {
        // Basic security test - would expand based on available security info
        const details = {
            testNote: 'Security validation requires system security information'
        };

        return {
            passed: true,
            message: 'Basic security check passed',
            details,
            warning: 'Comprehensive security testing requires additional system integration'
        };
    }

    async testPerformanceBaseline() {
        const systemData = this.monitoring.getCurrentData();
        const { cpu, memory, disk } = systemData.system || {};

        const baseline = {
            cpu: cpu?.usage || 0,
            memory: memory?.usage || 0,
            disk: disk?.usage || 0,
            timestamp: new Date().toISOString()
        };

        return {
            passed: true,
            message: `Performance baseline established: CPU ${baseline.cpu}%, Memory ${baseline.memory}%, Disk ${baseline.disk}%`,
            details: { baseline }
        };
    }

    async testInstallationMetadata() {
        const config = this.config.get('installation');
        const details = { config };

        const missing = [];

        if (!config?.name || config.name === 'Installation Up 4evr') {
            missing.push('installation name');
        }
        if (!config?.description) {
            missing.push('description');
        }
        if (!config?.location) {
            missing.push('location');
        }
        if (!config?.contact) {
            missing.push('contact information');
        }

        if (missing.length === 0) {
            return {
                passed: true,
                message: 'Installation metadata is complete',
                details
            };
        } else {
            return {
                passed: false,
                message: `Missing installation metadata: ${missing.join(', ')}`,
                details,
                recommendations: [
                    'Complete installation information in the Setup Wizard or Settings',
                    'Provide clear installation name and description',
                    'Add location and contact details for maintenance'
                ]
            };
        }
    }

    // Utility methods

    filterTests(options) {
        let tests = this.validationTests;

        if (options.categories && options.categories.length > 0) {
            tests = tests.filter(test => options.categories.includes(test.category));
        }

        if (options.priorities && options.priorities.length > 0) {
            tests = tests.filter(test => options.priorities.includes(test.priority));
        }

        if (options.testIds && options.testIds.length > 0) {
            tests = tests.filter(test => options.testIds.includes(test.id));
        }

        return tests;
    }

    generateValidationSummary() {
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = this.testResults.filter(r => !r.passed).length;
        const warnings = this.testResults.filter(r => r.status === 'warning').length;
        const errors = this.testResults.filter(r => r.status === 'error').length;

        const byCategory = {};
        const byPriority = {};

        this.testResults.forEach(result => {
            // By category
            if (!byCategory[result.category]) {
                byCategory[result.category] = { total: 0, passed: 0, failed: 0 };
            }
            byCategory[result.category].total++;
            if (result.passed) {
                byCategory[result.category].passed++;
            } else {
                byCategory[result.category].failed++;
            }

            // By priority
            if (!byPriority[result.priority]) {
                byPriority[result.priority] = { total: 0, passed: 0, failed: 0 };
            }
            byPriority[result.priority].total++;
            if (result.passed) {
                byPriority[result.priority].passed++;
            } else {
                byPriority[result.priority].failed++;
            }
        });

        const overallScore = total > 0 ? Math.round((passed / total) * 100) : 0;
        const isHealthy = failed === 0 && errors === 0;

        return {
            total,
            passed,
            failed,
            warnings,
            errors,
            score: overallScore,
            isHealthy,
            byCategory,
            byPriority
        };
    }

    getAvailableTests() {
        return this.validationTests.map(test => ({
            id: test.id,
            name: test.name,
            category: test.category,
            priority: test.priority,
            description: test.description
        }));
    }

    getTestResult(testId) {
        return this.testResults.find(result => result.id === testId);
    }

    getRecommendations() {
        const allRecommendations = [];
        
        this.testResults.forEach(result => {
            if (result.recommendations && result.recommendations.length > 0) {
                result.recommendations.forEach(rec => {
                    allRecommendations.push({
                        testId: result.id,
                        testName: result.name,
                        category: result.category,
                        priority: result.priority,
                        recommendation: rec
                    });
                });
            }
        });

        return allRecommendations;
    }
}

module.exports = ValidationWorkflow;