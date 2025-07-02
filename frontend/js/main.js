/**
 * @file main.js
 * @description Main entry point for the Installation Up 4evr frontend.
 */

import { AuthSessionManager } from './modules/auth.js';
import { MonitoringDataManager } from './modules/monitoring.js';
import { UIManager } from './modules/UIManager.js';
import { initSystemPreferences } from './modules/system-preferences.js';
import { initLaunchAgents } from './modules/launch-agents.js';
import { initMonitoringConfig } from './modules/monitoring-config.js';
import { initNotificationConfig } from './modules/notifications-config.js';

class InstallationUp4evr {
    constructor() {
        this.authSession = new AuthSessionManager();
        this.monitoringData = new MonitoringDataManager();
        this.uiManager = new UIManager();
        this.init();
    }

    async init() {
        console.log('[INIT] Initializing Installation Up 4evr...');
        
        await this.uiManager.init();

        this.setupTabNavigation();

        // Initialize all the modules
        initSystemPreferences();
        initLaunchAgents();
        initMonitoringConfig();
        initNotificationConfig();

        this.monitoringData.startMonitoring();
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.nav-link');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = tab.getAttribute('href').substring(1);
                this.navigateToTab(targetId);
            });
        });
    }

    navigateToTab(tabId) {
        const tabs = document.querySelectorAll('.nav-link');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        const newActiveTab = document.querySelector(`a[href="#${tabId}"]`);
        const newActiveContent = document.getElementById(tabId);

        if (newActiveTab) newActiveTab.classList.add('active');
        if (newActiveContent) newActiveContent.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new InstallationUp4evr();
});
