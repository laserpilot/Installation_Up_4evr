#!/usr/bin/env node

/**
 * ResourceDemo - Test Application for Installation Up 4evr
 * 
 * This app demonstrates monitoring functionality by:
 * - Gradually increasing CPU usage over time
 * - Progressively consuming more memory
 * - Logging resource metrics for monitoring testing
 * - Testing alert thresholds and notification systems
 * - Simulating real-world resource consumption patterns
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class ResourceDemo {
    constructor() {
        this.isRunning = true;
        this.logFile = path.join(os.homedir(), 'resource-demo.log');
        this.startTime = new Date();
        
        // Resource consumption state
        this.cpuWorkers = [];
        this.memoryBlocks = [];
        this.currentCpuLevel = 0;
        this.currentMemoryMB = 0;
        this.cycleCount = 0;
        
        // Configuration (can be overridden by environment variables)
        this.config = {
            cpuRampInterval: parseInt(process.env.CPU_RAMP_INTERVAL) || 15, // seconds between CPU increases
            memoryRampInterval: parseInt(process.env.MEMORY_RAMP_INTERVAL) || 20, // seconds between memory increases
            logInterval: parseInt(process.env.LOG_INTERVAL) || 10, // seconds between resource logs
            maxCpuPercent: parseInt(process.env.MAX_CPU_PERCENT) || 80, // maximum CPU usage %
            maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB) || 500, // maximum memory consumption
            cpuStepPercent: parseInt(process.env.CPU_STEP_PERCENT) || 10, // CPU increase per step
            memoryStepMB: parseInt(process.env.MEMORY_STEP_MB) || 25, // Memory increase per step
            pattern: process.env.RESOURCE_PATTERN || 'gradual' // 'gradual', 'spike', 'wave', 'plateau'
        };
        
        console.log(`📊 ResourceDemo started at ${this.startTime.toISOString()}`);
        console.log(`📝 Log file: ${this.logFile}`);
        console.log(`⚙️  Configuration: ${JSON.stringify(this.config, null, 2)}`);
        
        this.setupSignalHandlers();
        this.start();
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
            this.log(`💥 Uncaught Exception: ${error.message}`, 'ERROR');
            this.gracefulShutdown();
            process.exit(1);
        });
    }
    
    start() {
        this.log('🚀 ResourceDemo starting - initializing resource consumption', 'INFO');
        this.log(`📈 Pattern: ${this.config.pattern} - Max CPU: ${this.config.maxCpuPercent}% - Max Memory: ${this.config.maxMemoryMB}MB`, 'INFO');
        
        // Start resource monitoring
        this.startResourceLogging();
        
        // Start resource consumption based on pattern
        switch (this.config.pattern) {
            case 'gradual':
                this.startGradualPattern();
                break;
            case 'spike':
                this.startSpikePattern();
                break;
            case 'wave':
                this.startWavePattern();
                break;
            case 'plateau':
                this.startPlateauPattern();
                break;
            default:
                this.startGradualPattern();
        }
    }
    
    startResourceLogging() {
        setInterval(() => {
            if (this.isRunning) {
                this.logResourceUsage();
            }
        }, this.config.logInterval * 1000);
        
        // Log initial state
        this.logResourceUsage();
    }
    
    logResourceUsage() {
        const memUsage = process.memoryUsage();
        const uptime = Math.floor((new Date() - this.startTime) / 1000);
        
        // Calculate CPU usage approximation based on active workers
        const cpuEstimate = Math.min(this.currentCpuLevel, this.config.maxCpuPercent);
        
        const stats = {
            uptime: this.formatUptime(uptime),
            cpuWorkers: this.cpuWorkers.length,
            cpuEstimate: `${cpuEstimate}%`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            memoryBlocks: this.memoryBlocks.length,
            allocatedMemory: `${this.currentMemoryMB}MB`,
            pid: process.pid,
            cycle: this.cycleCount
        };
        
        this.log(`📊 Resources - ${Object.entries(stats).map(([k,v]) => `${k}: ${v}`).join(' | ')}`, 'METRICS');
        this.cycleCount++;
    }
    
    // Pattern: Gradual increase over time
    startGradualPattern() {
        this.log('📈 Starting GRADUAL resource consumption pattern', 'INFO');
        
        // CPU ramp
        const cpuTimer = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(cpuTimer);
                return;
            }
            
            if (this.currentCpuLevel < this.config.maxCpuPercent) {
                this.increaseCpuUsage(this.config.cpuStepPercent);
            }
        }, this.config.cpuRampInterval * 1000);
        
        // Memory ramp
        const memoryTimer = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(memoryTimer);
                return;
            }
            
            if (this.currentMemoryMB < this.config.maxMemoryMB) {
                this.increaseMemoryUsage(this.config.memoryStepMB);
            }
        }, this.config.memoryRampInterval * 1000);
    }
    
    // Pattern: Sudden spike then maintain
    startSpikePattern() {
        this.log('⚡ Starting SPIKE resource consumption pattern', 'INFO');
        
        setTimeout(() => {
            this.log('⚡ SPIKING CPU to maximum!', 'INFO');
            this.increaseCpuUsage(this.config.maxCpuPercent);
        }, 5000);
        
        setTimeout(() => {
            this.log('⚡ SPIKING Memory to maximum!', 'INFO');  
            this.increaseMemoryUsage(this.config.maxMemoryMB);
        }, 7000);
    }
    
    // Pattern: Wave-like oscillation
    startWavePattern() {
        this.log('🌊 Starting WAVE resource consumption pattern', 'INFO');
        
        let direction = 1; // 1 for up, -1 for down
        
        const waveTimer = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(waveTimer);
                return;
            }
            
            // Change direction at extremes
            if (this.currentCpuLevel >= this.config.maxCpuPercent) {
                direction = -1;
            } else if (this.currentCpuLevel <= 0) {
                direction = 1;
            }
            
            const change = direction * this.config.cpuStepPercent;
            this.adjustCpuUsage(change);
            
            // Memory follows CPU with some delay
            if (this.cycleCount % 2 === 0) {
                const memChange = direction * this.config.memoryStepMB;
                this.adjustMemoryUsage(memChange);
            }
        }, this.config.cpuRampInterval * 1000);
    }
    
    // Pattern: Quick ramp to plateau
    startPlateauPattern() {
        this.log('🏔️  Starting PLATEAU resource consumption pattern', 'INFO');
        
        // Quick ramp to 70% of max
        const rampTarget = Math.floor(this.config.maxCpuPercent * 0.7);
        const memoryTarget = Math.floor(this.config.maxMemoryMB * 0.7);
        
        let rampSteps = 0;
        const rampTimer = setInterval(() => {
            if (!this.isRunning || rampSteps >= 5) {
                clearInterval(rampTimer);
                this.log(`🏔️  Reached plateau - CPU: ${this.currentCpuLevel}%, Memory: ${this.currentMemoryMB}MB`, 'INFO');
                return;
            }
            
            const cpuStep = Math.floor(rampTarget / 5);
            const memStep = Math.floor(memoryTarget / 5);
            
            this.increaseCpuUsage(cpuStep);
            this.increaseMemoryUsage(memStep);
            rampSteps++;
        }, 3000);
    }
    
    increaseCpuUsage(percent) {
        const newLevel = Math.min(this.currentCpuLevel + percent, this.config.maxCpuPercent);
        const workersNeeded = Math.floor(newLevel / 10); // Rough approximation
        
        while (this.cpuWorkers.length < workersNeeded) {
            this.addCpuWorker();
        }
        
        this.currentCpuLevel = newLevel;
        this.log(`🔥 CPU increased to ~${this.currentCpuLevel}% (${this.cpuWorkers.length} workers)`, 'CPU');
    }
    
    adjustCpuUsage(percentChange) {
        if (percentChange > 0) {
            this.increaseCpuUsage(percentChange);
        } else {
            this.decreaseCpuUsage(Math.abs(percentChange));
        }
    }
    
    decreaseCpuUsage(percent) {
        const newLevel = Math.max(this.currentCpuLevel - percent, 0);
        const workersNeeded = Math.floor(newLevel / 10);
        
        while (this.cpuWorkers.length > workersNeeded) {
            this.removeCpuWorker();
        }
        
        this.currentCpuLevel = newLevel;
        this.log(`❄️  CPU decreased to ~${this.currentCpuLevel}% (${this.cpuWorkers.length} workers)`, 'CPU');
    }
    
    addCpuWorker() {
        const worker = setInterval(() => {
            if (!this.isRunning) return;
            
            // CPU-intensive work
            const start = Date.now();
            while (Date.now() - start < 50) {
                Math.random() * Math.random();
            }
        }, 100);
        
        this.cpuWorkers.push(worker);
    }
    
    removeCpuWorker() {
        const worker = this.cpuWorkers.pop();
        if (worker) {
            clearInterval(worker);
        }
    }
    
    increaseMemoryUsage(mb) {
        const newTotal = Math.min(this.currentMemoryMB + mb, this.config.maxMemoryMB);
        const blocksToAdd = newTotal - this.currentMemoryMB;
        
        for (let i = 0; i < blocksToAdd; i++) {
            // Allocate ~1MB blocks
            const block = new Array(250000).fill('memory-test-data-' + Math.random());
            this.memoryBlocks.push(block);
        }
        
        this.currentMemoryMB = newTotal;
        this.log(`🧠 Memory increased to ~${this.currentMemoryMB}MB (${this.memoryBlocks.length} blocks)`, 'MEMORY');
    }
    
    adjustMemoryUsage(mbChange) {
        if (mbChange > 0) {
            this.increaseMemoryUsage(mbChange);
        } else {
            this.decreaseMemoryUsage(Math.abs(mbChange));
        }
    }
    
    decreaseMemoryUsage(mb) {
        const newTotal = Math.max(this.currentMemoryMB - mb, 0);
        const blocksToRemove = this.currentMemoryMB - newTotal;
        
        for (let i = 0; i < blocksToRemove; i++) {
            this.memoryBlocks.pop();
        }
        
        this.currentMemoryMB = newTotal;
        this.log(`🧊 Memory decreased to ~${this.currentMemoryMB}MB (${this.memoryBlocks.length} blocks)`, 'MEMORY');
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }
    
    gracefulShutdown() {
        this.isRunning = false;
        
        // Clear all CPU workers
        this.cpuWorkers.forEach(worker => clearInterval(worker));
        this.cpuWorkers = [];
        
        // Clear memory blocks
        this.memoryBlocks = [];
        
        const endTime = new Date();
        const totalUptime = Math.floor((endTime - this.startTime) / 1000);
        
        this.log(`🛑 ResourceDemo stopping - Uptime: ${this.formatUptime(totalUptime)} - Cycles: ${this.cycleCount}`, 'INFO');
        this.log('♻️  Resources released - clean shutdown complete', 'INFO');
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
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
    new ResourceDemo();
}

module.exports = ResourceDemo;