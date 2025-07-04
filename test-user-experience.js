#!/usr/bin/env node

/**
 * Phase 8.7.3: User Experience Testing
 * Comprehensive testing of installation workflow, error messages, responsive design, and accessibility
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

class UserExperienceTestSuite {
    constructor() {
        this.results = {
            workflowTests: [],
            errorMessageTests: [],
            responsiveTests: [],
            accessibilityTests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        this.serverUrl = 'http://localhost:3001';
    }

    async runAllTests() {
        console.log('🧪 Starting Phase 8.7.3: User Experience Testing');
        console.log('=' .repeat(60));

        try {
            // Test 1: Complete Installation Workflow
            await this.testCompleteWorkflow();
            
            // Test 2: Error Message Verification  
            await this.testErrorMessages();
            
            // Test 3: Responsive Design Testing
            await this.testResponsiveDesign();
            
            // Test 4: Accessibility Testing
            await this.testAccessibility();
            
            // Generate comprehensive report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite error:', error.message);
        }
    }

    async testCompleteWorkflow() {
        console.log('\n📋 Testing Complete Installation Workflow');
        console.log('-'.repeat(50));

        const workflowSteps = [
            {
                name: 'Dashboard Navigation',
                test: () => this.testDashboardNavigation(),
                critical: true
            },
            {
                name: 'Setup Wizard Flow',
                test: () => this.testSetupWizardFlow(),
                critical: true
            },
            {
                name: 'System Configuration',
                test: () => this.testSystemConfiguration(),
                critical: true
            },
            {
                name: 'Launch Agent Creation',
                test: () => this.testLaunchAgentCreation(),
                critical: true
            },
            {
                name: 'Monitoring Setup',
                test: () => this.testMonitoringSetup(),
                critical: false
            },
            {
                name: 'Notification Configuration',
                test: () => this.testNotificationConfiguration(),
                critical: false
            }
        ];

        for (const step of workflowSteps) {
            try {
                const result = await step.test();
                this.addResult('workflowTests', {
                    name: step.name,
                    status: result.success ? 'PASS' : 'FAIL',
                    critical: step.critical,
                    details: result.details,
                    recommendations: result.recommendations || []
                });
                
                console.log(`${result.success ? '✅' : '❌'} ${step.name}: ${result.success ? 'PASS' : 'FAIL'}`);
                if (!result.success && step.critical) {
                    console.log(`   🚨 CRITICAL FAILURE: ${result.details}`);
                }
            } catch (error) {
                this.addResult('workflowTests', {
                    name: step.name,
                    status: 'ERROR',
                    critical: step.critical,
                    details: error.message,
                    recommendations: ['Fix the underlying error before retesting']
                });
                console.log(`💥 ${step.name}: ERROR - ${error.message}`);
            }
        }
    }

    async testDashboardNavigation() {
        // Test if dashboard loads and navigation works
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            
            // Check for essential elements
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const sidebarButtons = document.querySelectorAll('.sidebar-button');
            const tabPanes = document.querySelectorAll('.tab-pane');
            const dashboard = document.getElementById('dashboard-tab');
            
            if (sidebarButtons.length === 0) {
                return {
                    success: false,
                    details: 'No sidebar navigation buttons found',
                    recommendations: ['Check HTML structure for .sidebar-button elements']
                };
            }
            
            if (tabPanes.length === 0) {
                return {
                    success: false,
                    details: 'No tab content panes found',
                    recommendations: ['Check HTML structure for .tab-pane elements']
                };
            }
            
            if (!dashboard) {
                return {
                    success: false,
                    details: 'Dashboard tab not found',
                    recommendations: ['Ensure dashboard-tab element exists in HTML']
                };
            }
            
            return {
                success: true,
                details: `Found ${sidebarButtons.length} nav buttons, ${tabPanes.length} tab panes, dashboard present`,
                recommendations: []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Server connection failed: ${error.message}`,
                recommendations: ['Ensure backend server is running on port 3001']
            };
        }
    }

    async testSetupWizardFlow() {
        // Test setup wizard progression and validation
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            // Check wizard structure
            const wizardSteps = document.querySelectorAll('.wizard-step');
            const progressBar = document.getElementById('wizard-progress-fill');
            const nextButton = document.querySelector('#wizard-next-2, #wizard-next-4, #wizard-apply-settings');
            const backButton = document.querySelector('#wizard-back-1, #wizard-back-2, #wizard-back-3, #wizard-back-4');
            
            let issues = [];
            let features = [];
            
            if (wizardSteps.length < 6) {
                issues.push(`Only ${wizardSteps.length} wizard steps found, expected 6`);
            } else {
                features.push(`All ${wizardSteps.length} wizard steps present`);
            }
            
            if (!progressBar) {
                issues.push('Progress bar not found');
            } else {
                features.push('Progress bar present');
            }
            
            if (!nextButton) {
                issues.push('Next button not found');
            } else {
                features.push('Next button present');
            }
            
            if (!backButton) {
                issues.push('Back button not found');
            } else {
                features.push('Back button present');
            }
            
            // Check for step content
            const step1Content = document.getElementById('wizard-step-1');
            const step2Content = document.getElementById('wizard-step-2');
            const step3Content = document.getElementById('wizard-step-3');
            const step4Content = document.getElementById('wizard-step-4');
            
            if (step1Content) features.push('Welcome step content found');
            if (step2Content) features.push('System check step content found');
            if (step3Content) features.push('Essential settings step content found');
            if (step4Content) features.push('Application setup step content found');
            
            return {
                success: issues.length === 0,
                details: issues.length > 0 ? issues.join('; ') : features.join('; '),
                recommendations: issues.length > 0 ? ['Fix missing wizard elements'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Setup wizard test failed: ${error.message}`,
                recommendations: ['Check wizard HTML structure and JavaScript initialization']
            };
        }
    }

    async testSystemConfiguration() {
        // Test system preferences functionality
        try {
            // Test API endpoints
            const healthResponse = await fetch(`${this.serverUrl}/api/health`);
            const systemResponse = await fetch(`${this.serverUrl}/api/system-prefs/settings`);
            
            if (!healthResponse.ok) {
                return {
                    success: false,
                    details: 'Health endpoint not responding',
                    recommendations: ['Check backend server health']
                };
            }
            
            if (!systemResponse.ok) {
                return {
                    success: false,
                    details: 'System preferences endpoint not responding',
                    recommendations: ['Check system preferences API routes']
                };
            }
            
            const systemData = await systemResponse.json();
            
            // Check for essential system settings
            if (!systemData.data) {
                return {
                    success: false,
                    details: 'System settings data structure invalid',
                    recommendations: ['Verify system preferences data format']
                };
            }
            
            const settings = systemData.data;
            const expectedSettings = ['computerSleep', 'displaySleep', 'screensaver', 'doNotDisturb'];
            const foundSettings = expectedSettings.filter(setting => setting in settings);
            
            return {
                success: foundSettings.length >= 3,
                details: `Found ${foundSettings.length}/${expectedSettings.length} essential settings: ${foundSettings.join(', ')}`,
                recommendations: foundSettings.length < 3 ? ['Add missing essential system settings'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `System configuration test failed: ${error.message}`,
                recommendations: ['Check system preferences backend implementation']
            };
        }
    }

    async testLaunchAgentCreation() {
        // Test launch agent functionality
        try {
            const agentsResponse = await fetch(`${this.serverUrl}/api/launch-agents/list`);
            
            if (!agentsResponse.ok) {
                return {
                    success: false,
                    details: 'Launch agents endpoint not responding',
                    recommendations: ['Check launch agents API routes']
                };
            }
            
            const agentsData = await agentsResponse.json();
            
            // Check data structure
            if (!agentsData.success) {
                return {
                    success: false,
                    details: 'Launch agents API returning error response',
                    recommendations: ['Debug launch agents backend implementation']
                };
            }
            
            // Test HTML structure for launch agent interface
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const launchAgentsTab = document.getElementById('launch-agents-tab');
            const dropZone = document.querySelector('.drop-zone');
            const createButton = document.getElementById('create-launch-agent');
            
            let features = [];
            let issues = [];
            
            if (launchAgentsTab) features.push('Launch agents tab present');
            else issues.push('Launch agents tab missing');
            
            if (dropZone) features.push('Drop zone for apps present');
            else issues.push('Drop zone missing');
            
            if (createButton) features.push('Create button present');
            else issues.push('Create button missing');
            
            return {
                success: issues.length === 0,
                details: issues.length > 0 ? issues.join('; ') : features.join('; '),
                recommendations: issues.length > 0 ? ['Fix missing launch agent UI elements'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Launch agent test failed: ${error.message}`,
                recommendations: ['Check launch agents backend and frontend implementation']
            };
        }
    }

    async testMonitoringSetup() {
        // Test monitoring functionality
        try {
            const monitoringResponse = await fetch(`${this.serverUrl}/api/monitoring/status`);
            
            if (!monitoringResponse.ok) {
                return {
                    success: false,
                    details: 'Monitoring endpoint not responding',
                    recommendations: ['Check monitoring API routes']
                };
            }
            
            const monitoringData = await monitoringResponse.json();
            
            // Check for essential monitoring data
            if (!monitoringData.data || !monitoringData.data.system) {
                return {
                    success: false,
                    details: 'Monitoring data structure invalid',
                    recommendations: ['Verify monitoring data format']
                };
            }
            
            const system = monitoringData.data.system;
            const hasMetrics = system.cpu !== undefined && system.memory !== undefined && system.disk !== undefined;
            
            return {
                success: hasMetrics,
                details: hasMetrics ? 'Essential system metrics available' : 'Missing system metrics',
                recommendations: hasMetrics ? [] : ['Implement missing system monitoring metrics']
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Monitoring test failed: ${error.message}`,
                recommendations: ['Check monitoring backend implementation']
            };
        }
    }

    async testNotificationConfiguration() {
        // Test notification setup
        try {
            const notificationsResponse = await fetch(`${this.serverUrl}/api/notifications/config`);
            
            if (!notificationsResponse.ok) {
                return {
                    success: false,
                    details: 'Notifications endpoint not responding',
                    recommendations: ['Check notifications API routes']
                };
            }
            
            const notificationsData = await notificationsResponse.json();
            
            return {
                success: notificationsData.success !== false,
                details: notificationsData.success ? 'Notifications API working' : 'Notifications API error',
                recommendations: notificationsData.success ? [] : ['Fix notifications backend implementation']
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Notifications test failed: ${error.message}`,
                recommendations: ['Check notifications backend implementation']
            };
        }
    }

    async testErrorMessages() {
        console.log('\n💬 Testing Error Messages and Help Text');
        console.log('-'.repeat(50));

        const errorTests = [
            {
                name: 'API Error Handling',
                test: () => this.testApiErrorHandling()
            },
            {
                name: 'Form Validation Messages',
                test: () => this.testFormValidationMessages()
            },
            {
                name: 'Help Text Presence',
                test: () => this.testHelpTextPresence()
            },
            {
                name: 'Toast Notification System',
                test: () => this.testToastNotifications()
            }
        ];

        for (const test of errorTests) {
            try {
                const result = await test.test();
                this.addResult('errorMessageTests', {
                    name: test.name,
                    status: result.success ? 'PASS' : 'FAIL',
                    details: result.details,
                    recommendations: result.recommendations || []
                });
                console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`);
            } catch (error) {
                this.addResult('errorMessageTests', {
                    name: test.name,
                    status: 'ERROR',
                    details: error.message,
                    recommendations: ['Fix the underlying error before retesting']
                });
                console.log(`💥 ${test.name}: ERROR - ${error.message}`);
            }
        }
    }

    async testApiErrorHandling() {
        // Test how the application handles API errors
        try {
            // Test invalid endpoint
            const invalidResponse = await fetch(`${this.serverUrl}/api/invalid-endpoint`);
            
            if (invalidResponse.status === 404) {
                return {
                    success: true,
                    details: 'API properly returns 404 for invalid endpoints',
                    recommendations: []
                };
            } else {
                return {
                    success: false,
                    details: `Expected 404, got ${invalidResponse.status}`,
                    recommendations: ['Implement proper 404 handling for invalid API endpoints']
                };
            }
        } catch (error) {
            return {
                success: false,
                details: `API error handling test failed: ${error.message}`,
                recommendations: ['Check API error handling implementation']
            };
        }
    }

    async testFormValidationMessages() {
        // Test form validation and error messages
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            // Look for form elements and validation attributes
            const inputs = document.querySelectorAll('input[required], textarea[required]');
            const forms = document.querySelectorAll('form');
            const errorElements = document.querySelectorAll('.error, .error-message, .validation-error');
            
            let validationFeatures = [];
            
            if (inputs.length > 0) {
                validationFeatures.push(`${inputs.length} required input fields found`);
            }
            
            if (forms.length > 0) {
                validationFeatures.push(`${forms.length} forms found`);
            }
            
            if (errorElements.length > 0) {
                validationFeatures.push(`${errorElements.length} error message elements found`);
            }
            
            return {
                success: validationFeatures.length > 0,
                details: validationFeatures.length > 0 ? validationFeatures.join('; ') : 'No validation elements found',
                recommendations: validationFeatures.length === 0 ? ['Add form validation and error message elements'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Form validation test failed: ${error.message}`,
                recommendations: ['Check form validation implementation']
            };
        }
    }

    async testHelpTextPresence() {
        // Test for helpful explanatory text throughout the interface
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            // Look for help text elements
            const helpElements = document.querySelectorAll('.help-text, .description, .tooltip, .info, [data-tooltip], [title]');
            const explanationElements = document.querySelectorAll('p, .explanation, .note, .warning');
            
            let helpFeatures = [];
            
            if (helpElements.length > 0) {
                helpFeatures.push(`${helpElements.length} help/tooltip elements found`);
            }
            
            if (explanationElements.length > 10) {
                helpFeatures.push(`${explanationElements.length} explanatory text elements found`);
            }
            
            // Check for specific help content
            const wizardHelp = document.querySelectorAll('.wizard-step p, .wizard-step .description');
            if (wizardHelp.length > 0) {
                helpFeatures.push(`Setup wizard has ${wizardHelp.length} help text elements`);
            }
            
            return {
                success: helpFeatures.length > 0,
                details: helpFeatures.length > 0 ? helpFeatures.join('; ') : 'Limited help text found',
                recommendations: helpFeatures.length === 0 ? ['Add more explanatory text and tooltips'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Help text test failed: ${error.message}`,
                recommendations: ['Check help text implementation']
            };
        }
    }

    async testToastNotifications() {
        // Test toast notification system
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const toastContainer = document.getElementById('toast-container');
            const toastCSS = html.includes('.toast') || html.includes('toast-container');
            
            if (!toastContainer) {
                return {
                    success: false,
                    details: 'Toast container not found',
                    recommendations: ['Add toast notification container to HTML']
                };
            }
            
            if (!toastCSS) {
                return {
                    success: false,
                    details: 'Toast CSS not found',
                    recommendations: ['Add toast notification styles']
                };
            }
            
            return {
                success: true,
                details: 'Toast notification system present',
                recommendations: []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Toast notification test failed: ${error.message}`,
                recommendations: ['Check toast notification implementation']
            };
        }
    }

    async testResponsiveDesign() {
        console.log('\n📱 Testing Responsive Design');
        console.log('-'.repeat(50));

        const responsiveTests = [
            {
                name: 'CSS Media Queries',
                test: () => this.testMediaQueries()
            },
            {
                name: 'Mobile Layout Elements',
                test: () => this.testMobileLayout()
            },
            {
                name: 'Flexible Grid System',
                test: () => this.testFlexibleLayout()
            }
        ];

        for (const test of responsiveTests) {
            try {
                const result = await test.test();
                this.addResult('responsiveTests', {
                    name: test.name,
                    status: result.success ? 'PASS' : 'FAIL',
                    details: result.details,
                    recommendations: result.recommendations || []
                });
                console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`);
            } catch (error) {
                this.addResult('responsiveTests', {
                    name: test.name,
                    status: 'ERROR',
                    details: error.message,
                    recommendations: ['Fix the underlying error before retesting']
                });
                console.log(`💥 ${test.name}: ERROR - ${error.message}`);
            }
        }
    }

    async testMediaQueries() {
        // Test CSS media queries for responsive design
        try {
            const cssResponse = await fetch(`${this.serverUrl}/styles.css`);
            const css = await cssResponse.text();
            
            const mediaQueries = css.match(/@media[^{]+\{/g) || [];
            const mobileCCSS = css.includes('@media') && (css.includes('max-width') || css.includes('min-width'));
            const flexboxCSS = css.includes('display: flex') || css.includes('flexbox');
            const gridCSS = css.includes('display: grid') || css.includes('grid-template');
            
            let features = [];
            
            if (mediaQueries.length > 0) {
                features.push(`${mediaQueries.length} media queries found`);
            }
            
            if (mobileCCSS) {
                features.push('Mobile-responsive media queries present');
            }
            
            if (flexboxCSS) {
                features.push('Flexbox layout used');
            }
            
            if (gridCSS) {
                features.push('CSS Grid layout used');
            }
            
            return {
                success: mediaQueries.length > 0,
                details: features.length > 0 ? features.join('; ') : 'No responsive design features found',
                recommendations: mediaQueries.length === 0 ? ['Add responsive media queries'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Media queries test failed: ${error.message}`,
                recommendations: ['Check CSS file accessibility and media query implementation']
            };
        }
    }

    async testMobileLayout() {
        // Test mobile-specific layout considerations
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const viewport = document.querySelector('meta[name="viewport"]');
            const mobileMenu = document.querySelector('.mobile-menu, .hamburger, .nav-toggle');
            const responsiveImages = document.querySelectorAll('img[style*="max-width"], img.responsive');
            
            let features = [];
            let issues = [];
            
            if (viewport) {
                const viewportContent = viewport.getAttribute('content');
                if (viewportContent && viewportContent.includes('width=device-width')) {
                    features.push('Proper viewport meta tag found');
                } else {
                    issues.push('Viewport meta tag missing device-width');
                }
            } else {
                issues.push('Viewport meta tag missing');
            }
            
            if (mobileMenu) {
                features.push('Mobile navigation elements found');
            } else {
                issues.push('No mobile navigation elements found');
            }
            
            if (responsiveImages.length > 0) {
                features.push(`${responsiveImages.length} responsive images found`);
            }
            
            return {
                success: issues.length === 0,
                details: issues.length > 0 ? issues.join('; ') : features.join('; '),
                recommendations: issues.length > 0 ? ['Fix mobile layout issues'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Mobile layout test failed: ${error.message}`,
                recommendations: ['Check mobile layout implementation']
            };
        }
    }

    async testFlexibleLayout() {
        // Test flexible layout systems
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            
            const hasFlexbox = html.includes('display: flex') || html.includes('d-flex');
            const hasGrid = html.includes('display: grid') || html.includes('grid-template');
            const hasResponsiveClasses = html.includes('col-') || html.includes('responsive');
            
            let features = [];
            
            if (hasFlexbox) features.push('Flexbox layout detected');
            if (hasGrid) features.push('CSS Grid layout detected');
            if (hasResponsiveClasses) features.push('Responsive CSS classes detected');
            
            return {
                success: features.length > 0,
                details: features.length > 0 ? features.join('; ') : 'No flexible layout systems detected',
                recommendations: features.length === 0 ? ['Implement flexible layout system (Flexbox or Grid)'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Flexible layout test failed: ${error.message}`,
                recommendations: ['Check layout system implementation']
            };
        }
    }

    async testAccessibility() {
        console.log('\n♿ Testing Accessibility');
        console.log('-'.repeat(50));

        const accessibilityTests = [
            {
                name: 'Semantic HTML Structure',
                test: () => this.testSemanticHTML()
            },
            {
                name: 'Keyboard Navigation',
                test: () => this.testKeyboardNavigation()
            },
            {
                name: 'ARIA Labels and Roles',
                test: () => this.testARIALabels()
            },
            {
                name: 'Color Contrast and Focus',
                test: () => this.testColorAndFocus()
            }
        ];

        for (const test of accessibilityTests) {
            try {
                const result = await test.test();
                this.addResult('accessibilityTests', {
                    name: test.name,
                    status: result.success ? 'PASS' : 'FAIL',
                    details: result.details,
                    recommendations: result.recommendations || []
                });
                console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.success ? 'PASS' : 'FAIL'}`);
            } catch (error) {
                this.addResult('accessibilityTests', {
                    name: test.name,
                    status: 'ERROR',
                    details: error.message,
                    recommendations: ['Fix the underlying error before retesting']
                });
                console.log(`💥 ${test.name}: ERROR - ${error.message}`);
            }
        }
    }

    async testSemanticHTML() {
        // Test semantic HTML structure
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const semanticElements = {
                header: document.querySelectorAll('header').length,
                nav: document.querySelectorAll('nav').length,
                main: document.querySelectorAll('main').length,
                section: document.querySelectorAll('section').length,
                article: document.querySelectorAll('article').length,
                aside: document.querySelectorAll('aside').length,
                footer: document.querySelectorAll('footer').length
            };
            
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const buttons = document.querySelectorAll('button');
            const links = document.querySelectorAll('a');
            const forms = document.querySelectorAll('form');
            
            let features = [];
            let issues = [];
            
            // Check semantic structure
            const semanticCount = Object.values(semanticElements).reduce((sum, count) => sum + count, 0);
            if (semanticCount > 0) {
                features.push(`${semanticCount} semantic HTML5 elements found`);
            } else {
                issues.push('No semantic HTML5 elements found');
            }
            
            // Check heading structure
            if (headings.length > 0) {
                features.push(`${headings.length} headings found`);
                const h1Count = document.querySelectorAll('h1').length;
                if (h1Count === 1) {
                    features.push('Proper single H1 structure');
                } else if (h1Count === 0) {
                    issues.push('No H1 heading found');
                } else {
                    issues.push(`Multiple H1 headings found (${h1Count})`);
                }
            } else {
                issues.push('No headings found');
            }
            
            // Check interactive elements
            if (buttons.length > 0) {
                features.push(`${buttons.length} buttons found`);
            }
            
            if (links.length > 0) {
                features.push(`${links.length} links found`);
            }
            
            return {
                success: issues.length === 0,
                details: issues.length > 0 ? issues.join('; ') + '. ' + features.join('; ') : features.join('; '),
                recommendations: issues.length > 0 ? ['Fix semantic HTML structure issues'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Semantic HTML test failed: ${error.message}`,
                recommendations: ['Check HTML semantic structure']
            };
        }
    }

    async testKeyboardNavigation() {
        // Test keyboard navigation support
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const focusableElements = document.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
            const skipLinks = document.querySelectorAll('a[href^="#"], .skip-link');
            const tabIndexElements = document.querySelectorAll('[tabindex]');
            
            let features = [];
            let issues = [];
            
            if (focusableElements.length > 0) {
                features.push(`${focusableElements.length} focusable elements found`);
            } else {
                issues.push('No focusable elements found');
            }
            
            if (skipLinks.length > 0) {
                features.push(`${skipLinks.length} skip links found`);
            } else {
                issues.push('No skip links for keyboard navigation');
            }
            
            // Check for negative tabindex (anti-pattern)
            const negativeTabIndex = document.querySelectorAll('[tabindex="-1"]');
            if (negativeTabIndex.length > 0) {
                issues.push(`${negativeTabIndex.length} elements with tabindex="-1" (may block keyboard access)`);
            }
            
            return {
                success: focusableElements.length > 0,
                details: issues.length > 0 ? issues.join('; ') + '. ' + features.join('; ') : features.join('; '),
                recommendations: issues.length > 0 ? ['Improve keyboard navigation support'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Keyboard navigation test failed: ${error.message}`,
                recommendations: ['Check keyboard navigation implementation']
            };
        }
    }

    async testARIALabels() {
        // Test ARIA labels and roles
        try {
            const response = await fetch(this.serverUrl);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const ariaLabels = document.querySelectorAll('[aria-label]');
            const ariaDescribedBy = document.querySelectorAll('[aria-describedby]');
            const ariaRoles = document.querySelectorAll('[role]');
            const ariaHidden = document.querySelectorAll('[aria-hidden]');
            const altTexts = document.querySelectorAll('img[alt]');
            const missingAltTexts = document.querySelectorAll('img:not([alt])');
            
            let features = [];
            let issues = [];
            
            if (ariaLabels.length > 0) {
                features.push(`${ariaLabels.length} ARIA labels found`);
            }
            
            if (ariaDescribedBy.length > 0) {
                features.push(`${ariaDescribedBy.length} ARIA descriptions found`);
            }
            
            if (ariaRoles.length > 0) {
                features.push(`${ariaRoles.length} ARIA roles found`);
            }
            
            if (altTexts.length > 0) {
                features.push(`${altTexts.length} images with alt text`);
            }
            
            if (missingAltTexts.length > 0) {
                issues.push(`${missingAltTexts.length} images missing alt text`);
            }
            
            // Check for form labels
            const inputs = document.querySelectorAll('input, textarea, select');
            const labeledInputs = document.querySelectorAll('input[id], textarea[id], select[id]');
            const labels = document.querySelectorAll('label[for]');
            
            if (inputs.length > 0 && labels.length === 0) {
                issues.push('Form inputs found but no labels detected');
            } else if (labels.length > 0) {
                features.push(`${labels.length} form labels found`);
            }
            
            return {
                success: issues.length === 0 && features.length > 0,
                details: issues.length > 0 ? issues.join('; ') + '. ' + features.join('; ') : features.join('; '),
                recommendations: issues.length > 0 ? ['Add missing ARIA labels and alt text'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `ARIA labels test failed: ${error.message}`,
                recommendations: ['Check ARIA implementation']
            };
        }
    }

    async testColorAndFocus() {
        // Test color contrast and focus indicators
        try {
            const cssResponse = await fetch(`${this.serverUrl}/styles.css`);
            const css = await cssResponse.text();
            
            const hasFocusStyles = css.includes(':focus') || css.includes('focus-visible');
            const hasHighContrast = css.includes('contrast') || css.includes('#000') || css.includes('#fff');
            const hasColorVariables = css.includes('--color') || css.includes('--primary') || css.includes('--secondary');
            
            let features = [];
            let issues = [];
            
            if (hasFocusStyles) {
                features.push('Focus styles detected in CSS');
            } else {
                issues.push('No focus styles found in CSS');
            }
            
            if (hasHighContrast) {
                features.push('High contrast colors detected');
            }
            
            if (hasColorVariables) {
                features.push('CSS color variables found (good for theming)');
            }
            
            // Check for potential accessibility issues
            if (css.includes('outline: none') || css.includes('outline:none')) {
                issues.push('CSS contains "outline: none" which may harm keyboard navigation');
            }
            
            return {
                success: hasFocusStyles && issues.length === 0,
                details: issues.length > 0 ? issues.join('; ') + '. ' + features.join('; ') : features.join('; '),
                recommendations: issues.length > 0 ? ['Fix color contrast and focus indicator issues'] : []
            };
            
        } catch (error) {
            return {
                success: false,
                details: `Color and focus test failed: ${error.message}`,
                recommendations: ['Check CSS color and focus implementation']
            };
        }
    }

    addResult(category, result) {
        this.results[category].push(result);
        this.results.summary.total++;
        
        if (result.status === 'PASS') {
            this.results.summary.passed++;
        } else if (result.status === 'FAIL') {
            this.results.summary.failed++;
        } else {
            this.results.summary.warnings++;
        }
    }

    generateReport() {
        console.log('\n📊 User Experience Testing Report');
        console.log('='.repeat(60));
        
        const { summary } = this.results;
        const successRate = ((summary.passed / summary.total) * 100).toFixed(1);
        
        console.log(`\n📈 Overall Results:`);
        console.log(`   Total Tests: ${summary.total}`);
        console.log(`   Passed: ${summary.passed} (${successRate}%)`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Errors: ${summary.warnings}`);
        
        // Category breakdown
        const categories = ['workflowTests', 'errorMessageTests', 'responsiveTests', 'accessibilityTests'];
        const categoryNames = ['Workflow', 'Error Messages', 'Responsive Design', 'Accessibility'];
        
        console.log(`\n📋 Category Breakdown:`);
        categories.forEach((category, index) => {
            const results = this.results[category];
            const passed = results.filter(r => r.status === 'PASS').length;
            const total = results.length;
            const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
            console.log(`   ${categoryNames[index]}: ${passed}/${total} (${rate}%)`);
        });
        
        // Critical issues
        console.log(`\n🚨 Critical Issues:`);
        let criticalIssues = 0;
        categories.forEach((category) => {
            this.results[category].forEach(result => {
                if (result.status !== 'PASS' && result.critical) {
                    criticalIssues++;
                    console.log(`   ❌ ${result.name}: ${result.details}`);
                }
            });
        });
        
        if (criticalIssues === 0) {
            console.log('   ✅ No critical issues found!');
        }
        
        // Recommendations
        console.log(`\n💡 Key Recommendations:`);
        const allRecommendations = [];
        categories.forEach((category) => {
            this.results[category].forEach(result => {
                if (result.recommendations && result.recommendations.length > 0) {
                    allRecommendations.push(...result.recommendations);
                }
            });
        });
        
        const uniqueRecommendations = [...new Set(allRecommendations)];
        if (uniqueRecommendations.length > 0) {
            uniqueRecommendations.slice(0, 10).forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        } else {
            console.log('   ✅ No major improvements needed!');
        }
        
        // Save detailed report
        this.saveDetailedReport();
        
        console.log(`\n🎯 Phase 8.7.3 User Experience Testing: ${successRate >= 80 ? 'COMPLETE' : 'NEEDS IMPROVEMENT'}`);
        console.log(`📄 Detailed report saved to: test-results-user-experience.json`);
    }

    saveDetailedReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            testSuite: 'Phase 8.7.3: User Experience Testing',
            summary: this.results.summary,
            categories: {
                workflowTests: this.results.workflowTests,
                errorMessageTests: this.results.errorMessageTests,
                responsiveTests: this.results.responsiveTests,
                accessibilityTests: this.results.accessibilityTests
            }
        };
        
        fs.writeFileSync('test-results-user-experience.json', JSON.stringify(reportData, null, 2));
    }
}

// Run the test suite
const testSuite = new UserExperienceTestSuite();
testSuite.runAllTests();