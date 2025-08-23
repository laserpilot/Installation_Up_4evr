/**
 * @file ProcessCard.js
 * @description Component for rendering a process card for PM2 and system processes.
 */

function getProcessIcon(process) {
    const label = process.label.toLowerCase();
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

export function createProcessCard(process, status) {
    const statusClass = status.isRunning ? 'status-running' : 'status-stopped';
    const icon = getProcessIcon(process);
    
    // Detect if this process was created by our tool (PM2-managed processes)
    const isToolCreated = process.managedByTool === true || 
                         process.label.includes('installation-up-4evr') || 
                         (process.plistPath && process.plistPath.includes('PM2'));
    
    const toolBadge = isToolCreated ? '<span class="tool-created-badge"><i class="fas fa-server"></i> PM2 Managed</span>' : '';

    // Format PM2 monitoring data
    const cpuUsage = process.cpu !== undefined ? `${process.cpu.toFixed(1)}%` : 'N/A';
    const memoryUsage = process.memory !== undefined ? `${Math.round(process.memory / 1024 / 1024)}MB` : 'N/A';
    const restartCount = process.restarts !== undefined ? process.restarts : 'N/A';
    const processPath = process.plistPath === 'Managed by PM2' ? process.program : process.plistPath;

    return `
        <div class="process-card ${statusClass} ${isToolCreated ? 'tool-created' : ''}" data-label="${process.label}">
            <div class="process-header">
                <i class="fas ${icon} process-icon"></i>
                <div class="process-title">
                    <h4>${process.label} ${toolBadge}</h4>
                    <p title="${processPath}">${processPath}</p>
                </div>
            </div>
            <div class="process-details">
                <div class="process-status">
                    <span class="status-indicator"></span>
                    <span>${status.isRunning ? 'Running' : 'Stopped'}</span>
                    ${process.pm2_id !== undefined ? `<span class="pm2-id">ID: ${process.pm2_id}</span>` : ''}
                </div>
                <div class="process-info">
                    <span>PID: ${status.pid || 'N/A'}</span>
                    <span>CPU: ${cpuUsage}</span>
                    <span>MEM: ${memoryUsage}</span>
                    <span>Restarts: ${restartCount}</span>
                </div>
            </div>
            <div class="process-actions">
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
