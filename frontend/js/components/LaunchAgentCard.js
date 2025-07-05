/**
 * @file LaunchAgentCard.js
 * @description Component for rendering a Launch Agent card.
 */

function getAgentIcon(agent) {
    const label = agent.label.toLowerCase();
    if (label.includes('apple')) return 'fa-apple';
    if (label.includes('google')) return 'fa-google';
    if (label.includes('adobe')) return 'fa-adobe';
    if (label.includes('microsoft')) return 'fa-windows';
    if (label.includes('update')) return 'fa-arrow-circle-up';
    if (label.includes('backup')) return 'fa-save';
    if (label.includes('sync')) return 'fa-sync';
    if (label.includes('helper')) return 'fa-life-ring';
    if (label.includes('daemon')) return 'fa-cogs';
    return 'fa-cog';
}

export function createAgentCard(agent, status) {
    const statusClass = status.isRunning ? 'status-running' : 'status-stopped';
    const icon = getAgentIcon(agent);
    
    // Detect if this agent was created by our tool
    const isToolCreated = agent.label.includes('installation-up-4evr') || 
                         agent.plistPath.includes('installation-up-4evr') ||
                         (agent.webAppInfo && agent.webAppInfo.isWebApp) ||
                         agent.createdByTool === true;
    
    const toolBadge = isToolCreated ? '<span class="tool-created-badge"><i class="fas fa-rocket"></i> Tool Created</span>' : '';

    return `
        <div class="agent-card ${statusClass} ${isToolCreated ? 'tool-created' : ''}" data-label="${agent.label}">
            <div class="agent-header">
                <i class="fas ${icon} agent-icon"></i>
                <div class="agent-title">
                    <h4>${agent.label} ${toolBadge}</h4>
                    <p>${agent.plistPath}</p>
                </div>
            </div>
            <div class="agent-details">
                <div class="agent-status">
                    <span class="status-indicator"></span>
                    <span>${status.isRunning ? 'Running' : 'Stopped'}</span>
                </div>
                <div class="agent-info">
                    <span>PID: ${status.pid || 'N/A'}</span>
                    <span>Exit: ${status.lastExitStatus || 'N/A'}</span>
                </div>
            </div>
            <div class="agent-actions">
                <button class="btn-action" data-action="start" title="Start"><i class="fas fa-play"></i></button>
                <button class="btn-action" data-action="stop" title="Stop"><i class="fas fa-stop"></i></button>
                <button class="btn-action" data-action="restart" title="Restart"><i class="fas fa-sync-alt"></i></button>
                <button class="btn-action" data-action="test" title="Test Agent"><i class="fas fa-flask"></i></button>
                <button class="btn-action" data-action="export" title="Export Agent"><i class="fas fa-download"></i></button>
                <button class="btn-action" data-action="view" title="View Plist"><i class="fas fa-eye"></i></button>
                <button class="btn-action" data-action="edit" title="Edit Plist"><i class="fas fa-edit"></i></button>
                <button class="btn-action" data-action="delete" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `;
}
