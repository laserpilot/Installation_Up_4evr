#!/usr/bin/env node

/**
 * CrashSimulator - Test Application for Installation Up 4evr
 * 
 * This app demonstrates keep-alive functionality by:
 * - Running normally for random periods (10-60 seconds)
 * - Randomly crashing with different failure modes
 * - Logging all activity to show crash/restart cycles
 * - Testing launch agent restart capabilities
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class CrashSimulator {
    constructor() {
        this.isRunning = true;
        this.crashTimer = null;
        this.heartbeatTimer = null;
        this.logFile = path.join(os.homedir(), 'crash-simulator.log');
        this.startTime = new Date();
        this.sessionCount = this.getSessionCount() + 1;
        
        // Configuration (can be overridden by environment variables)
        this.config = {
            minRunTime: parseInt(process.env.CRASH_MIN_SECONDS) || 10,  // 10 seconds minimum
            maxRunTime: parseInt(process.env.CRASH_MAX_SECONDS) || 60,  // 60 seconds maximum
            heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 5, // 5 second heartbeat
            crashTypes: ['exception', 'exit', 'timeout', 'memory'], // Available crash types
            enabledCrashes: (process.env.CRASH_TYPES || 'exception,exit,timeout').split(',')
        };
        
        console.log(`💥 CrashSimulator Session #${this.sessionCount} started at ${this.startTime.toISOString()}`);
        console.log(`📝 Log file: ${this.logFile}`);
        console.log(`⚙️  Configuration: ${JSON.stringify(this.config, null, 2)}`);
        
        this.saveSessionCount();
        this.setupSignalHandlers();
        this.start();
    }
    
    getSessionCount() {
        const sessionFile = path.join(os.homedir(), '.crash-simulator-sessions');
        try {
            return parseInt(fs.readFileSync(sessionFile, 'utf8')) || 0;
        } catch (error) {
            return 0;
        }
    }
    
    saveSessionCount() {
        const sessionFile = path.join(os.homedir(), '.crash-simulator-sessions');
        try {
            fs.writeFileSync(sessionFile, this.sessionCount.toString());
        } catch (error) {
            this.log(`Failed to save session count: ${error.message}`, 'WARN');
        }
    }
    
    setupSignalHandlers() {
        process.on('SIGTERM', () => {
            this.log('📴 Received SIGTERM - shutting down gracefully...', 'INFO');
            this.gracefulShutdown();
        });
        
        process.on('SIGINT', () => {
            this.log('📴 Received SIGINT - shutting down gracefully...', 'INFO');
            this.gracefulShutdown();
        });
        
        process.on('uncaughtException', (error) => {
            this.log(`💥 Uncaught Exception (not simulated): ${error.message}`, 'ERROR');
            this.gracefulShutdown();
            process.exit(1);
        });
    }
    
    start() {
        this.log('🚀 CrashSimulator starting - setting up crash timer and heartbeat', 'INFO');
        
        // Schedule random crash
        this.scheduleCrash();
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Log initial status
        this.log(`⏱️  Will crash randomly between ${this.config.minRunTime}-${this.config.maxRunTime} seconds`, 'INFO');
        this.log(`💗 Heartbeat every ${this.config.heartbeatInterval} seconds`, 'INFO');
    }
    
    scheduleCrash() {
        const crashTime = Math.random() * (this.config.maxRunTime - this.config.minRunTime) + this.config.minRunTime;
        const crashTimeMs = crashTime * 1000;
        
        this.log(`⏰ Next crash scheduled in ${Math.round(crashTime)} seconds`, 'INFO');
        
        this.crashTimer = setTimeout(() => {
            if (this.isRunning) {
                this.simulateCrash();
            }
        }, crashTimeMs);
    }
    
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.isRunning) {
                this.heartbeat();
            }
        }, this.config.heartbeatInterval * 1000);
        
        // Send first heartbeat immediately
        this.heartbeat();
    }
    
    heartbeat() {
        const now = new Date();
        const uptime = Math.floor((now - this.startTime) / 1000);
        const nextCrashIn = this.crashTimer ? Math.floor(this.crashTimer._idleTimeout / 1000) : 'unknown';
        
        this.log(`💗 Heartbeat - Session #${this.sessionCount} - Uptime: ${this.formatUptime(uptime)} - Next crash: ~${nextCrashIn}s - PID: ${process.pid}`, 'HEARTBEAT');
    }
    
    simulateCrash() {
        const availableCrashes = this.config.enabledCrashes.filter(type => 
            this.config.crashTypes.includes(type)
        );
        
        const crashType = availableCrashes[Math.floor(Math.random() * availableCrashes.length)];
        const uptime = Math.floor((new Date() - this.startTime) / 1000);
        
        this.log(`💀 SIMULATING CRASH: ${crashType.toUpperCase()} after ${this.formatUptime(uptime)} uptime`, 'CRASH');
        
        // Clear timers before crashing
        if (this.crashTimer) {
            clearTimeout(this.crashTimer);
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        // Wait a moment for log to write
        setTimeout(() => {
            switch (crashType) {
                case 'exception':
                    this.crashWithException();
                    break;
                case 'exit':
                    this.crashWithExit();
                    break;
                case 'timeout':
                    this.crashWithTimeout();
                    break;
                case 'memory':
                    this.crashWithMemoryLeak();
                    break;
                default:
                    this.crashWithException(); // Default fallback
            }
        }, 100);
    }
    
    crashWithException() {
        this.log('🔥 Throwing uncaught exception...', 'CRASH');
        setTimeout(() => {
            throw new Error(`Simulated crash - Session #${this.sessionCount} - ${new Date().toISOString()}`);
        }, 50);
    }
    
    crashWithExit() {
        this.log('🚪 Exiting with error code 1...', 'CRASH');
        setTimeout(() => {
            process.exit(1);
        }, 50);
    }
    
    crashWithTimeout() {
        this.log('⏳ Creating infinite timeout loop...', 'CRASH');
        setTimeout(() => {
            // Create a situation that will cause the process to hang and eventually be killed
            const createHangingPromise = () => {
                return new Promise(() => {
                    // This promise never resolves, creating a hang
                    setInterval(() => {
                        // Busy wait to consume CPU
                        let waste = 0;
                        for (let i = 0; i < 10000000; i++) {
                            waste += Math.random();
                        }
                    }, 10);
                });
            };
            
            createHangingPromise();
        }, 50);
    }
    
    crashWithMemoryLeak() {
        this.log('🧠 Creating memory leak to force crash...', 'CRASH');
        setTimeout(() => {
            const memoryHog = [];
            const interval = setInterval(() => {
                // Allocate increasingly large amounts of memory
                const chunk = new Array(1000000).fill('memory-leak-data-' + Math.random());
                memoryHog.push(chunk);
                
                // Log memory usage
                const used = process.memoryUsage();
                this.log(`💾 Memory usage: ${Math.round(used.heapUsed / 1024 / 1024)} MB heap, ${Math.round(used.rss / 1024 / 1024)} MB total`, 'CRASH');
                
                // Stop allocation after a reasonable amount to avoid system issues
                if (memoryHog.length > 100) {
                    clearInterval(interval);
                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc();
                    }
                    // Then exit
                    process.exit(1);
                }
            }, 100);
        }, 50);
    }
    
    gracefulShutdown() {
        this.isRunning = false;
        
        if (this.crashTimer) {
            clearTimeout(this.crashTimer);
            this.crashTimer = null;
        }
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        
        const endTime = new Date();
        const totalUptime = Math.floor((endTime - this.startTime) / 1000);
        
        this.log(`🛑 CrashSimulator Session #${this.sessionCount} stopping gracefully - Uptime: ${this.formatUptime(totalUptime)}`, 'INFO');
        this.log('👋 Goodbye! (This was a clean shutdown, not a crash)', 'INFO');
        
        setTimeout(() => {
            process.exit(0);
        }, 100);
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
}

// Start the application
if (require.main === module) {
    new CrashSimulator();
}

module.exports = CrashSimulator;