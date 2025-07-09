/**
 * @file system.js
 * @description Main system tab controller that manages both system preferences and installation settings.
 */

import { initSystemPreferences } from './system-preferences.js';
import { initInstallationSettings } from './installation-settings.js';

export function initSystem() {
    // Initialize both system preferences and installation settings
    initSystemPreferences();
    initInstallationSettings();
}
