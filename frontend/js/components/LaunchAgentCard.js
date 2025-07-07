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
    
    // Detect if this agent was created by our tool (PM2-managed processes)
    const isToolCreated = agent.managedByTool === true || 
                         agent.label.includes('installation-up-4evr') || 
                         (agent.plistPath && agent.plistPath.includes('PM2'));
    
    const toolBadge = isToolCreated ? '<span class="tool-created-badge"><i class="fas fa-rocket"></i> PM2 Managed</span>' : '';

    // Format PM2 monitoring data
    const cpuUsage = agent.cpu !== undefined ? `${agent.cpu.toFixed(1)}%` : 'N/A';
    const memoryUsage = agent.memory !== undefined ? `${Math.round(agent.memory / 1024 / 1024)}MB` : 'N/A';
    const restartCount = agent.restarts !== undefined ? agent.restarts : 'N/A';
    const processPath = agent.plistPath === 'Managed by PM2' ? agent.program : agent.plistPath;

    return `
        <div class="agent-card ${statusClass} ${isToolCreated ? 'tool-created' : ''}" data-label="${agent.label}">
            <div class="agent-header">
                <i class="fas ${icon} agent-icon"></i>
                <div class="agent-title">
                    <h4>${agent.label} ${toolBadge}</h4>
                    <p title="${processPath}">${processPath}</p>
                </div>
            </div>
            <div class="agent-details">
                <div class="agent-status">
                    <span class="status-indicator"></span>
                    <span>${status.isRunning ? 'Running' : 'Stopped'}</span>
                    ${agent.pm2_id !== undefined ? `<span class="pm2-id">ID: ${agent.pm2_id}</span>` : ''}
                </div>
                <div class="agent-info">
                    <span>PID: ${status.pid || 'N/A'}</span>
                    <span>CPU: ${cpuUsage}</span>
                    <span>MEM: ${memoryUsage}</span>
                    <span>Restarts: ${restartCount}</span>
                </div>
            </div>
            <div class="agent-actions">
                <button class="btn-action" data-action="start" title="Start Process"><i class="fas fa-play"></i></button>
                <button class="btn-action" data-action="stop" title="Stop Process"><i class="fas fa-stop"></i></button>
                <button class="btn-action" data-action="restart" title="Restart Process"><i class="fas fa-sync-alt"></i></button>
                <button class="btn-action" data-action="test" title="View Process Info"><i class="fas fa-info-circle"></i></button>
                ${isToolCreated ? `
                <button class="btn-action" data-action="export" title="Export PM2 Config"><i class="fas fa-download"></i></button>
                <button class="btn-action" data-action="view" title="View Process Details"><i class="fas fa-eye"></i></button>
                <button class="btn-action" data-action="delete" title="Remove Process"><i class="fas fa-trash-alt"></i></button>
                ` : ''}
            </div>
        </div>
    `;
}
