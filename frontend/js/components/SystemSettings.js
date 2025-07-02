/**
 * @file SystemSettings.js
 * @description Component for rendering system settings.
 */

import { escapeHtml } from '../utils/ui.js';

function getStatusClass(status) {
    switch (status) {
        case 'applied': return 'status-applied';
        case 'not_applied': return 'status-needs-applying';
        case 'error': return 'status-error';
        case 'unknown': return 'status-unknown';
        default: return 'status-unknown';
    }
}

function createSettingItem(setting, status) {
    const statusClass = getStatusClass(status.status);
    const isDangerZone = setting.category === 'danger';
    const dangerClass = isDangerZone ? 'danger-setting' : '';

    return `
        <div class="setting-item ${statusClass} ${dangerClass}" data-setting-id="${setting.id}" data-category="${setting.category}">
            <label class="checkbox-label">
                <input type="checkbox" data-setting="${setting.id}" ${isDangerZone ? 'data-danger="true"' : ''}>
                <span class="checkbox-custom"></span>
                <div class="setting-content">
                    <div class="setting-header">
                        <h4>${setting.name} <span class="status-emoji">${status.statusIcon}</span></h4>
                        <span class="status-text">${status.statusText}</span>
                    </div>
                    <p>${setting.description}</p>
                </div>
            </label>
        </div>
    `;
}

export function renderSettings(container, settings, statusLookup = {}) {
    const settingsArray = Array.isArray(settings) 
        ? settings 
        : Object.entries(settings).map(([key, setting]) => ({
            id: key,
            ...setting
        }));

    if (settingsArray.length === 0) {
        container.innerHTML = '<div class="no-settings">No settings available</div>';
        return;
    }

    const categorizedSettings = settingsArray.reduce((acc, setting) => {
        const category = setting.category || 'general';
        if (!acc[category]) acc[category] = [];
        acc[category].push(setting);
        return acc;
    }, {});

    const categoryInfo = {
        power: { name: 'Power & Sleep', icon: 'fas fa-bolt', description: 'Essential settings for unattended operation' },
        ui: { name: 'User Interface', icon: 'fas fa-desktop', description: 'Display and interface behavior' },
        performance: { name: 'Performance', icon: 'fas fa-tachometer-alt', description: 'System performance optimizations' },
        network: { name: 'Network', icon: 'fas fa-wifi', description: 'Network and connectivity settings' },
        general: { name: 'General', icon: 'fas fa-cog', description: 'General system settings' },
        danger: { name: '⚠️ Expert / Danger Zone', icon: 'fas fa-exclamation-triangle', description: 'Advanced settings with security implications' }
    };

    const categoryOrder = ['power', 'ui', 'performance', 'network', 'general', 'danger'];

    container.innerHTML = categoryOrder.map(categoryKey => {
        const categorySettings = categorizedSettings[categoryKey];
        if (!categorySettings || categorySettings.length === 0) return '';

        const categoryMeta = categoryInfo[categoryKey];
        const isDangerZone = categoryKey === 'danger';

        const settingsHtml = categorySettings.map(setting => {
            const status = statusLookup[setting.id] || { statusIcon: '⚪', statusText: 'Unknown' };
            return createSettingItem(setting, status);
        }).join('');

        const dangerZoneClass = isDangerZone ? 'danger-zone-category' : '';
        const collapsedClass = isDangerZone ? 'collapsed' : '';

        return `
            <div class="settings-category ${dangerZoneClass} ${collapsedClass}" data-category="${categoryKey}">
                <div class="category-header" ${isDangerZone ? 'onclick="this.parentElement.classList.toggle(\'collapsed\')"' : ''}>
                    <h3>
                        <i class="${categoryMeta.icon}"></i>
                        ${categoryMeta.name}
                        ${isDangerZone ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
                    </h3>
                    <p class="category-description">${categoryMeta.description}</p>
                    ${isDangerZone ? '<p class="danger-warning">⚠️ These settings may compromise system security. Use with caution!</p>' : ''}
                </div>
                <div class="category-settings">
                    ${settingsHtml}
                </div>
            </div>
        `;
    }).filter(html => html).join('');
}
