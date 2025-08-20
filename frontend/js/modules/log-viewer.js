/**
 * @file log-viewer.js
 * @description Log viewer module for Installation Up 4evr.
 */

import { apiCall } from '../utils/api.js';

/**
 * Log Viewer Manager
 */
export class LogViewerManager {
    constructor() {
        this.logs = [];
        this.autoRefreshInterval = null;
        this.autoRefreshEnabled = false;
        this.refreshRate = 5000; // 5 seconds
        this.maxLogEntries = 100;
    }

    async initialize() {
        console.log('[LOG-VIEWER] Initializing log viewer system');
        this.setupEventListeners();
        await this.loadLogs();
    }

    setupEventListeners() {
        const refreshButton = document.getElementById('refresh-logs');
        const clearButton = document.getElementById('clear-log-viewer');
        const autoRefreshButton = document.getElementById('toggle-auto-refresh');

        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshLogs());
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearLogs());
        }

        if (autoRefreshButton) {
            autoRefreshButton.addEventListener('click', () => this.toggleAutoRefresh());
        }
    }

    async loadLogs() {
        try {
            const response = await apiCall('/api/logs/tail');
            if (response && Array.isArray(response)) {
                this.logs = response.slice(0, this.maxLogEntries);
            } else if (response && response.data && Array.isArray(response.data)) {
                this.logs = response.data.slice(0, this.maxLogEntries);
            } else {
                this.logs = [];
            }
            this.renderLogs();
        } catch (error) {
            console.error('[LOG-VIEWER] Failed to load logs:', error);
            this.showError('Failed to load logs: ' + error.message);
        }
    }

    async refreshLogs() {
        console.log('[LOG-VIEWER] Refreshing logs...');
        await this.loadLogs();
        this.updateStats();
    }

    clearLogs() {
        this.logs = [];
        this.renderLogs();
        this.updateStats();
    }

    toggleAutoRefresh() {
        const button = document.getElementById('toggle-auto-refresh');
        const icon = button.querySelector('i');

        if (this.autoRefreshEnabled) {
            // Stop auto-refresh
            this.autoRefreshEnabled = false;
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
                this.autoRefreshInterval = null;
            }
            button.classList.remove('auto-refresh-active');
            icon.className = 'fas fa-play';
            button.title = 'Start auto-refresh';
            console.log('[LOG-VIEWER] Auto-refresh stopped');
        } else {
            // Start auto-refresh
            this.autoRefreshEnabled = true;
            this.autoRefreshInterval = setInterval(() => {
                this.refreshLogs();
            }, this.refreshRate);
            button.classList.add('auto-refresh-active');
            icon.className = 'fas fa-pause';
            button.title = 'Stop auto-refresh';
            console.log('[LOG-VIEWER] Auto-refresh started');
        }
    }

    renderLogs() {
        const logViewer = document.getElementById('log-viewer');
        if (!logViewer) return;

        if (this.logs.length === 0) {
            logViewer.innerHTML = `
                <div class="log-empty">
                    <i class="fas fa-file-alt"></i> No log entries found
                </div>
            `;
            return;
        }

        const logEntries = this.logs.map(log => this.formatLogEntry(log)).join('');
        logViewer.innerHTML = logEntries;

        // Auto-scroll to bottom to show latest logs
        logViewer.scrollTop = logViewer.scrollHeight;
    }

    formatLogEntry(log) {
        const timestamp = this.formatTimestamp(log.timestamp);
        const level = (log.level || 'info').toLowerCase();
        const category = log.category || 'system';
        const message = this.escapeHtml(log.message || '');

        return `
            <div class="log-entry" title="${new Date(log.timestamp).toLocaleString()}">
                <span class="log-timestamp">${timestamp}</span>
                <span class="log-level ${level}">${level}</span>
                <span class="log-category">${category}</span>
                <span class="log-message">${message}</span>
            </div>
        `;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const statsElement = document.getElementById('log-viewer-stats');
        if (!statsElement) return;

        const logCount = statsElement.querySelector('.log-count');
        const lastUpdate = statsElement.querySelector('.log-last-update');

        if (logCount) {
            logCount.textContent = `${this.logs.length} entries`;
        }

        if (lastUpdate) {
            lastUpdate.textContent = `Updated ${new Date().toLocaleTimeString()}`;
        }
    }

    showError(message) {
        const logViewer = document.getElementById('log-viewer');
        if (!logViewer) return;

        logViewer.innerHTML = `
            <div class="log-empty">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
        `;
    }

    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        this.autoRefreshEnabled = false;
    }
}

// Export for global access
window.LogViewerManager = LogViewerManager;