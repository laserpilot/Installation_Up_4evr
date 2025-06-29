/**
 * macOS Monitoring Provider
 * Platform-specific monitoring implementation for macOS
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class MacOSMonitoringProvider {
    constructor() {
        this.platform = 'macos';
    }

    /**
     * Get system metrics (CPU, memory, disk, temperature)
     */
    async getSystemMetrics() {
        const metrics = {
            cpu: await this.getCPUUsage(),
            memory: await this.getMemoryUsage(),
            disk: await this.getDiskUsage(),
            uptime: await this.getUptime(),
            load: await this.getLoadAverage(),
            temperature: await this.getTemperature()
        };

        return metrics;
    }

    /**
     * Get CPU usage percentage
     */
    async getCPUUsage() {
        try {
            // Use top command to get CPU usage
            const { stdout } = await execAsync("top -l 1 -n 0 | grep 'CPU usage'");
            const match = stdout.match(/(\d+\.\d+)% user/);
            const usage = match ? parseFloat(match[1]) : 0;
            
            // Get CPU core count
            const { stdout: coreCount } = await execAsync('sysctl -n hw.ncpu');
            const cores = parseInt(coreCount.trim());

            return {
                usage,
                cores,
                status: usage > 90 ? 'critical' : usage > 70 ? 'warning' : 'good'
            };
        } catch (error) {
            console.error('Failed to get CPU usage:', error);
            return { usage: 0, cores: 0, status: 'unknown' };
        }
    }

    /**
     * Get memory usage
     */
    async getMemoryUsage() {
        try {
            const { stdout } = await execAsync('vm_stat');
            const lines = stdout.split('\n');
            
            let pageSize = 4096; // Default page size
            let freePages = 0;
            let activePages = 0;
            let inactivePages = 0;
            let wiredPages = 0;

            lines.forEach(line => {
                if (line.includes('page size of')) {
                    const match = line.match(/(\d+)/);
                    if (match) pageSize = parseInt(match[1]);
                } else if (line.includes('Pages free:')) {
                    const match = line.match(/(\d+)/);
                    if (match) freePages = parseInt(match[1]);
                } else if (line.includes('Pages active:')) {
                    const match = line.match(/(\d+)/);
                    if (match) activePages = parseInt(match[1]);
                } else if (line.includes('Pages inactive:')) {
                    const match = line.match(/(\d+)/);
                    if (match) inactivePages = parseInt(match[1]);
                } else if (line.includes('Pages wired down:')) {
                    const match = line.match(/(\d+)/);
                    if (match) wiredPages = parseInt(match[1]);
                }
            });

            const totalPages = freePages + activePages + inactivePages + wiredPages;
            const usedPages = totalPages - freePages;
            const totalBytes = totalPages * pageSize;
            const usedBytes = usedPages * pageSize;
            const usage = totalPages > 0 ? (usedPages / totalPages) * 100 : 0;

            return {
                usage,
                total: totalBytes,
                used: usedBytes,
                available: freePages * pageSize,
                status: usage > 90 ? 'critical' : usage > 70 ? 'warning' : 'good'
            };
        } catch (error) {
            console.error('Failed to get memory usage:', error);
            return { usage: 0, total: 0, used: 0, available: 0, status: 'unknown' };
        }
    }

    /**
     * Get disk usage
     */
    async getDiskUsage() {
        try {
            const { stdout } = await execAsync('df -h /');
            const lines = stdout.split('\n');
            if (lines.length > 1) {
                const parts = lines[1].split(/\s+/);
                const usageStr = parts[4] || '0%';
                const usage = parseFloat(usageStr.replace('%', ''));
                const total = parts[1] || '0';
                const used = parts[2] || '0';
                const available = parts[3] || '0';

                return {
                    usage,
                    total,
                    used,
                    available,
                    status: usage > 90 ? 'critical' : usage > 80 ? 'warning' : 'good'
                };
            }
            throw new Error('Invalid df output');
        } catch (error) {
            console.error('Failed to get disk usage:', error);
            return { usage: 0, total: '0', used: '0', available: '0', status: 'unknown' };
        }
    }

    /**
     * Get system uptime
     */
    async getUptime() {
        try {
            const { stdout } = await execAsync('uptime');
            const uptimeMatch = stdout.match(/up\s+(?:(\d+)\s+days?,\s*)?(?:(\d+):(\d+)|(\d+)\s+hrs?)/);
            
            let totalSeconds = 0;
            if (uptimeMatch) {
                const days = parseInt(uptimeMatch[1] || '0');
                const hours = parseInt(uptimeMatch[2] || uptimeMatch[4] || '0');
                const minutes = parseInt(uptimeMatch[3] || '0');
                totalSeconds = (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60);
            }

            return {
                seconds: totalSeconds,
                formatted: this.formatUptime(totalSeconds)
            };
        } catch (error) {
            console.error('Failed to get uptime:', error);
            return { seconds: 0, formatted: 'Unknown' };
        }
    }

    /**
     * Get load average
     */
    async getLoadAverage() {
        try {
            const { stdout } = await execAsync('uptime');
            const loadMatch = stdout.match(/load averages?:\s*([\d.]+)\s*([\d.]+)\s*([\d.]+)/);
            
            if (loadMatch) {
                return {
                    1: parseFloat(loadMatch[1]),
                    5: parseFloat(loadMatch[2]),
                    15: parseFloat(loadMatch[3])
                };
            }
            throw new Error('Could not parse load average');
        } catch (error) {
            console.error('Failed to get load average:', error);
            return { 1: 0, 5: 0, 15: 0 };
        }
    }

    /**
     * Get CPU temperature (requires additional tools on macOS)
     */
    async getTemperature() {
        try {
            // This would require installing temperature monitoring tools
            // For now, return placeholder
            return {
                cpu: 0,
                status: 'unknown'
            };
        } catch (error) {
            return { cpu: 0, status: 'unknown' };
        }
    }

    /**
     * Get network information
     */
    async getNetworkInfo() {
        try {
            // Get primary network interface
            const { stdout: routeOutput } = await execAsync('route get default');
            const interfaceMatch = routeOutput.match(/interface:\s*(\w+)/);
            const primaryInterface = interfaceMatch ? interfaceMatch[1] : null;

            // Get IP addresses
            const { stdout: ifconfigOutput } = await execAsync('ifconfig');
            const interfaces = this.parseNetworkInterfaces(ifconfigOutput);

            // Find primary IP
            let primaryIP = null;
            if (primaryInterface && interfaces[primaryInterface]) {
                primaryIP = interfaces[primaryInterface].ip;
            }

            // Test connectivity
            const connectivity = await this.testConnectivity();

            return {
                interfaces: Object.entries(interfaces).map(([name, info]) => ({
                    name,
                    ...info
                })),
                primaryInterface,
                primaryIP,
                connectivity
            };
        } catch (error) {
            console.error('Failed to get network info:', error);
            return {
                interfaces: [],
                primaryInterface: null,
                primaryIP: null,
                connectivity: false
            };
        }
    }

    /**
     * Get application status
     */
    async getApplicationStatus(watchedApps = []) {
        const applications = [];

        for (const appName of watchedApps) {
            try {
                // Check if application is running
                const { stdout } = await execAsync(`pgrep -f "${appName}"`);
                const isRunning = stdout.trim().length > 0;

                applications.push({
                    name: appName,
                    status: isRunning ? 'running' : 'stopped',
                    pid: isRunning ? stdout.trim().split('\n')[0] : null,
                    shouldBeRunning: true
                });
            } catch (error) {
                // pgrep returns non-zero exit code when no processes found
                applications.push({
                    name: appName,
                    status: 'stopped',
                    pid: null,
                    shouldBeRunning: true
                });
            }
        }

        return applications;
    }

    /**
     * Get display information
     */
    async getDisplayInfo() {
        try {
            const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
            const data = JSON.parse(stdout);
            const displays = [];

            if (data.SPDisplaysDataType) {
                data.SPDisplaysDataType.forEach((graphicsCard, cardIndex) => {
                    if (graphicsCard.spdisplays_ndrvs && Array.isArray(graphicsCard.spdisplays_ndrvs)) {
                        graphicsCard.spdisplays_ndrvs.forEach((display, displayIndex) => {
                            displays.push({
                                id: `display_${cardIndex}_${displayIndex}`,
                                name: display._name || `Display ${displayIndex + 1}`,
                                online: display.spdisplays_online === 'spdisplays_yes',
                                resolution: display.spdisplays_resolution || 'Unknown',
                                pixelDepth: display.spdisplays_pixeldepth || 'Unknown',
                                mirror: display.spdisplays_mirror || 'Off'
                            });
                        });
                    }
                });
            }

            return displays;
        } catch (error) {
            console.error('Failed to get display info:', error);
            return [];
        }
    }

    /**
     * Helper methods
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    parseNetworkInterfaces(ifconfigOutput) {
        const interfaces = {};
        const blocks = ifconfigOutput.split(/\n(?=\w)/);

        blocks.forEach(block => {
            const lines = block.split('\n');
            const firstLine = lines[0];
            const nameMatch = firstLine.match(/^(\w+):/);
            
            if (nameMatch) {
                const name = nameMatch[1];
                const info = { ip: null, status: 'down' };

                lines.forEach(line => {
                    if (line.includes('inet ') && !line.includes('127.0.0.1')) {
                        const ipMatch = line.match(/inet\s+([\d.]+)/);
                        if (ipMatch) info.ip = ipMatch[1];
                    }
                    if (line.includes('status: active')) {
                        info.status = 'up';
                    }
                });

                interfaces[name] = info;
            }
        });

        return interfaces;
    }

    async testConnectivity() {
        try {
            await execAsync('ping -c 1 -W 5000 8.8.8.8');
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = MacOSMonitoringProvider;