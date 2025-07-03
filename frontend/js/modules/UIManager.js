/**
 * @file UIManager.js
 * @description Manages the UI based on the detected platform.
 */

import { apiCall } from '../utils/api.js';

export class UIManager {
    constructor() {
        this.platform = null;
    }

    async init() {
        try {
            const platformInfo = await apiCall('/api/platform');
            console.log('[UI MANAGER] Raw platformInfo response:', platformInfo);
            this.platform = platformInfo.data.platform; // Assuming platform is nested under 'data'
            console.log(`[UI MANAGER] Detected platform: ${this.platform}`);
            this.loadPlatformSpecificUI();
        } catch (error) {
            console.error('[UI MANAGER] Failed to detect platform, defaulting to macos', error);
            this.platform = 'macos';
            this.loadPlatformSpecificUI();
        }
    }

    loadPlatformSpecificUI() {
        if (this.platform === 'windows') {
            // Hide macOS-specific elements
            document.querySelectorAll('.macos-only').forEach(el => el.style.display = 'none');
            // Show Windows-specific elements
            document.querySelectorAll('.windows-only').forEach(el => el.style.display = 'block');

            // Update text for Windows
            document.getElementById('launch-agents-title').textContent = 'Services';
        } else {
            // Default to macOS view
            document.querySelectorAll('.windows-only').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.macos-only').forEach(el => el.style.display = 'block');
        }
    }
}
