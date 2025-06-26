#!/usr/bin/env node

/**
 * HeartbeatApp - Simple Test Application for Installation Up 4evr
 * 
 * This app demonstrates basic launch agent functionality by:
 * - Logging a heartbeat message every 5 seconds
 * - Writing to both console and log file
 * - Running indefinitely (perfect for testing keep-alive)
 * - Graceful shutdown on SIGTERM/SIGINT
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class HeartbeatApp {
    constructor() {
        this.isRunning = true;
        this.intervalId = null;
        this.logFile = path.join(os.homedir(), 'heartbeat-app.log');
        this.startTime = new Date();
        
        console.log(`🫀 HeartbeatApp started at ${this.startTime.toISOString()}`);
        console.log(`📝 Log file: ${this.logFile}`);
        
        this.setupSignalHandlers();
        this.start();
    }
    
    setupSignalHandlers() {
        process.on('SIGTERM', () => {
            console.log('📴 Received SIGTERM - shutting down gracefully...');
            this.stop();
        });
        
        process.on('SIGINT', () => {
            console.log('📴 Received SIGINT - shutting down gracefully...');
            this.stop();
        });
        
        process.on('uncaughtException', (error) => {
            this.log(`💥 Uncaught Exception: ${error.message}`, 'ERROR');
            this.stop();
            process.exit(1);
        });
    }
    
    start() {
        this.log('🚀 HeartbeatApp starting heartbeat cycle', 'INFO');
        
        this.intervalId = setInterval(() => {
            if (this.isRunning) {
                this.heartbeat();
            }
        }, 5000); // 5 seconds
        
        // Send first heartbeat immediately
        this.heartbeat();
    }
    
    heartbeat() {
        const now = new Date();
        const uptime = Math.floor((now - this.startTime) / 1000);
        const message = `💓 Heartbeat - Uptime: ${this.formatUptime(uptime)} - PID: ${process.pid}`;
        
        this.log(message, 'HEARTBEAT');
    }
    
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${level}] ${message}`;
        
        // Console output
        console.log(logLine);
        
        // File output
        try {
            fs.appendFileSync(this.logFile, logLine + '\n');
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
    }
    
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    stop() {
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        const endTime = new Date();
        const totalUptime = Math.floor((endTime - this.startTime) / 1000);
        
        this.log(`🛑 HeartbeatApp stopping - Total uptime: ${this.formatUptime(totalUptime)}`, 'INFO');
        this.log('👋 Goodbye!', 'INFO');
        
        setTimeout(() => {
            process.exit(0);
        }, 100); // Give time for final log writes
    }
}

// Start the application
if (require.main === module) {
    new HeartbeatApp();
}

module.exports = HeartbeatApp;