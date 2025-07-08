/**
 * PM2 Service Manager
 * Manages the backend service using PM2 process manager
 */

const pm2 = require('pm2');
const path = require('path');
const fs = require('fs').promises;

class PM2ServiceManager {
    constructor() {
        this.serviceName = 'installation-up-4evr-backend';
        this.pm2Connected = false;
        this.ecosystemPath = path.join(__dirname, '../../../ecosystem.config.js');
    }

    /**
     * Connect to PM2 daemon
     */
    async connect() {
        if (this.pm2Connected) return;

        return new Promise((resolve, reject) => {
            pm2.connect((err) => {
                if (err) {
                    console.error('[PM2] Connection failed:', err);
                    reject(err);
                    return;
                }
                this.pm2Connected = true;
                console.log('[PM2] Connected successfully');
                resolve();
            });
        });
    }

    /**
     * Disconnect from PM2
     */
    async disconnect() {
        if (!this.pm2Connected) return;

        return new Promise((resolve) => {
            pm2.disconnect(() => {
                this.pm2Connected = false;
                console.log('[PM2] Disconnected');
                resolve();
            });
        });
    }

    /**
     * Get current service status from PM2
     */
    async getServiceStatus() {
        try {
            await this.connect();

            return new Promise((resolve, reject) => {
                pm2.describe(this.serviceName, (err, list) => {
                    if (err) {
                        // Service not found in PM2
                        resolve({
                            status: 'not_managed',
                            message: 'Service not managed by PM2',
                            pid: process.pid,
                            uptime: process.uptime(),
                            pm2_managed: false,
                            management_mode: 'Node.js direct'
                        });
                        return;
                    }

                    if (!list || list.length === 0) {
                        resolve({
                            status: 'not_found',
                            message: 'Service not found in PM2',
                            pid: process.pid,
                            uptime: process.uptime(),
                            pm2_managed: false,
                            management_mode: 'Node.js direct'
                        });
                        return;
                    }

                    const pm2Process = list[0];
                    const pm2_env = pm2Process.pm2_env;
                    const monit = pm2Process.monit;

                    resolve({
                        status: pm2_env.status,
                        message: `Service is ${pm2_env.status} under PM2 management`,
                        pid: pm2Process.pid,
                        uptime: Math.floor((Date.now() - pm2_env.pm_uptime) / 1000),
                        pm2_managed: true,
                        management_mode: 'PM2',
                        pm2_id: pm2_env.pm_id,
                        restart_time: pm2_env.restart_time,
                        cpu_usage: monit.cpu,
                        memory_usage: monit.memory,
                        created_at: pm2_env.created_at,
                        pm2_version: pm2_env.version
                    });
                });
            });
        } catch (error) {
            console.error('[PM2] Failed to get service status:', error);
            return {
                status: 'error',
                message: 'Failed to check PM2 status',
                pid: process.pid,
                uptime: process.uptime(),
                pm2_managed: false,
                management_mode: 'Node.js direct',
                error: error.message
            };
        }
    }

    /**
     * Start service with PM2
     */
    async startService() {
        try {
            await this.connect();

            // Check if ecosystem file exists
            try {
                await fs.access(this.ecosystemPath);
            } catch {
                throw new Error(`Ecosystem file not found: ${this.ecosystemPath}`);
            }

            return new Promise((resolve, reject) => {
                pm2.start(this.ecosystemPath, (err, proc) => {
                    if (err) {
                        console.error('[PM2] Failed to start service:', err);
                        reject(new Error(`Failed to start service with PM2: ${err.message}`));
                        return;
                    }

                    console.log('[PM2] Service started successfully');
                    resolve({
                        success: true,
                        message: 'Service started with PM2',
                        process: proc
                    });
                });
            });
        } catch (error) {
            console.error('[PM2] Start service error:', error);
            throw error;
        }
    }

    /**
     * Stop service via PM2
     */
    async stopService() {
        try {
            await this.connect();

            return new Promise((resolve, reject) => {
                pm2.stop(this.serviceName, (err) => {
                    if (err) {
                        console.error('[PM2] Failed to stop service:', err);
                        reject(new Error(`Failed to stop service: ${err.message}`));
                        return;
                    }

                    console.log('[PM2] Service stopped successfully');
                    resolve({
                        success: true,
                        message: 'Service stopped with PM2'
                    });
                });
            });
        } catch (error) {
            console.error('[PM2] Stop service error:', error);
            throw error;
        }
    }

    /**
     * Restart service via PM2
     */
    async restartService() {
        try {
            await this.connect();

            return new Promise((resolve, reject) => {
                pm2.restart(this.serviceName, (err) => {
                    if (err) {
                        console.error('[PM2] Failed to restart service:', err);
                        reject(new Error(`Failed to restart service: ${err.message}`));
                        return;
                    }

                    console.log('[PM2] Service restarted successfully');
                    resolve({
                        success: true,
                        message: 'Service restarted with PM2'
                    });
                });
            });
        } catch (error) {
            console.error('[PM2] Restart service error:', error);
            throw error;
        }
    }

    /**
     * Delete service from PM2
     */
    async deleteService() {
        try {
            await this.connect();

            return new Promise((resolve, reject) => {
                pm2.delete(this.serviceName, (err) => {
                    if (err) {
                        console.error('[PM2] Failed to delete service:', err);
                        reject(new Error(`Failed to delete service: ${err.message}`));
                        return;
                    }

                    console.log('[PM2] Service deleted from PM2');
                    resolve({
                        success: true,
                        message: 'Service removed from PM2'
                    });
                });
            });
        } catch (error) {
            console.error('[PM2] Delete service error:', error);
            throw error;
        }
    }

    /**
     * Get PM2 process list
     */
    async getProcessList() {
        try {
            await this.connect();

            return new Promise((resolve, reject) => {
                pm2.list((err, list) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(list.map(proc => ({
                        name: proc.name,
                        pid: proc.pid,
                        status: proc.pm2_env.status,
                        restart_time: proc.pm2_env.restart_time,
                        cpu: proc.monit.cpu,
                        memory: proc.monit.memory,
                        uptime: Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000)
                    })));
                });
            });
        } catch (error) {
            console.error('[PM2] Failed to get process list:', error);
            throw error;
        }
    }

    /**
     * Install service to PM2 (start with ecosystem config)
     */
    async installService() {
        try {
            // First check if service is already running in PM2
            const status = await this.getServiceStatus();
            if (status.pm2_managed) {
                throw new Error('Service is already managed by PM2');
            }

            // Start the service with PM2
            const result = await this.startService();
            
            // Save PM2 configuration
            await this.connect();
            await new Promise((resolve, reject) => {
                pm2.save((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });

            console.log('[PM2] Service installed and configured for auto-start');
            return {
                success: true,
                message: 'Service installed with PM2 and configured for auto-start',
                ...result
            };
        } catch (error) {
            console.error('[PM2] Install service error:', error);
            throw error;
        }
    }
}

module.exports = PM2ServiceManager;