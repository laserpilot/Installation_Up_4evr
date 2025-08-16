/**
 * Screenshot Logger for Visual Forensics
 * Captures periodic screenshots for installation troubleshooting
 * DEFAULT: OFF - Enable only when needed due to privacy/storage concerns
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const { LOG_LEVELS } = require('./logger');

class ScreenshotLogger {
  constructor(logger, options = {}) {
    this.logger = logger;
    this.options = {
      enabled: options.enabled || false, // OFF by default
      interval: options.interval || 60 * 60 * 1000, // 1 hour default
      retentionHours: options.retentionHours || 48, // 48 hours max
      screenshotDir: options.screenshotDir || 
        path.join(os.homedir(), '.installation-up-4evr', 'screenshots'),
      quality: options.quality || 50, // 0-100, lower = smaller files
      format: options.format || 'jpg', // jpg or png
      onlyOnEvents: options.onlyOnEvents || false, // Only capture during incidents
      maxFiles: options.maxFiles || 100,
      ...options
    };

    this.intervalId = null;
    this.screenshotHistory = [];
    this.isCapturing = false;
  }

  /**
   * Start screenshot logging (if enabled)
   */
  async start() {
    if (!this.options.enabled) {
      this.logger.info('application', 'Screenshot logging is disabled by configuration');
      return;
    }

    if (this.intervalId) {
      this.logger.warn('application', 'Screenshot logging already running');
      return;
    }

    try {
      // Create screenshot directory
      await fs.mkdir(this.options.screenshotDir, { recursive: true });

      this.logger.info('application', 'Starting screenshot logging', {
        interval: this.options.interval,
        retention: `${this.options.retentionHours} hours`,
        quality: this.options.quality,
        format: this.options.format,
        onlyOnEvents: this.options.onlyOnEvents,
        directory: this.options.screenshotDir
      });

      // Clean up old screenshots first
      await this.cleanup();

      if (!this.options.onlyOnEvents) {
        // Take initial screenshot
        await this.captureScreenshot('startup');

        // Set up regular interval
        this.intervalId = setInterval(async () => {
          await this.captureScreenshot('interval');
        }, this.options.interval);
      } else {
        this.logger.info('application', 'Screenshot logging in event-only mode');
      }

    } catch (error) {
      this.logger.logException(error, {
        operation: 'startScreenshotLogging',
        component: 'ScreenshotLogger'
      });
    }
  }

  /**
   * Stop screenshot logging
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info('application', 'Stopped screenshot logging');
    }
  }

  /**
   * Capture a screenshot
   */
  async captureScreenshot(trigger = 'manual', metadata = {}) {
    if (this.isCapturing) {
      this.logger.debug('application', 'Screenshot capture already in progress, skipping');
      return null;
    }

    this.isCapturing = true;

    try {
      const timestamp = new Date();
      const filename = this.generateFilename(timestamp, trigger);
      const filepath = path.join(this.options.screenshotDir, filename);

      // Platform-specific screenshot capture
      await this.captureScreenshotPlatform(filepath);

      // Verify file was created and get size
      const stats = await fs.stat(filepath);
      
      const screenshotInfo = {
        timestamp: timestamp.toISOString(),
        filename,
        filepath,
        trigger,
        size: stats.size,
        quality: this.options.quality,
        format: this.options.format,
        metadata
      };

      // Add to history
      this.screenshotHistory.push(screenshotInfo);

      // Log the screenshot capture
      this.logger.baseline(LOG_LEVELS.DEBUG, 'Screenshot captured', {
        screenshotInfo,
        historyCount: this.screenshotHistory.length
      });

      // Cleanup if we have too many files
      if (this.screenshotHistory.length > this.options.maxFiles) {
        await this.cleanup();
      }

      return screenshotInfo;

    } catch (error) {
      this.logger.logException(error, {
        operation: 'captureScreenshot',
        trigger,
        component: 'ScreenshotLogger'
      });
      return null;
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * Platform-specific screenshot capture
   */
  async captureScreenshotPlatform(filepath) {
    const platform = process.platform;

    try {
      switch (platform) {
        case 'darwin': // macOS
          await this.captureScreenshotMacOS(filepath);
          break;
        case 'win32': // Windows
          await this.captureScreenshotWindows(filepath);
          break;
        case 'linux':
          await this.captureScreenshotLinux(filepath);
          break;
        default:
          throw new Error(`Screenshot capture not supported on platform: ${platform}`);
      }
    } catch (error) {
      throw new Error(`Failed to capture screenshot: ${error.message}`);
    }
  }

  /**
   * Capture screenshot on macOS
   */
  async captureScreenshotMacOS(filepath) {
    const ext = this.options.format;
    const quality = this.options.quality;
    
    if (ext === 'jpg') {
      // For JPG, capture as PNG first then convert for quality control
      const tempPath = filepath.replace('.jpg', '.png');
      execSync(`screencapture -x "${tempPath}"`, { timeout: 10000 });
      
      // Convert to JPG with quality setting
      execSync(`sips -s format jpeg -s formatOptions ${quality} "${tempPath}" --out "${filepath}"`, 
        { timeout: 10000 });
      
      // Remove temp PNG file
      await fs.unlink(tempPath);
    } else {
      // Direct PNG capture
      execSync(`screencapture -x "${filepath}"`, { timeout: 10000 });
    }
  }

  /**
   * Capture screenshot on Windows
   */
  async captureScreenshotWindows(filepath) {
    // Using PowerShell for Windows screenshots
    const powershellScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $Screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
      $bitmap = New-Object System.Drawing.Bitmap $Screen.Width, $Screen.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($Screen.Left, $Screen.Top, 0, 0, $bitmap.Size)
      $bitmap.Save("${filepath}")
      $graphics.Dispose()
      $bitmap.Dispose()
    `;

    execSync(`powershell -Command "${powershellScript}"`, { timeout: 10000 });
  }

  /**
   * Capture screenshot on Linux
   */
  async captureScreenshotLinux(filepath) {
    // Try different screenshot tools
    const tools = [
      { cmd: 'gnome-screenshot', args: `-f "${filepath}"` },
      { cmd: 'scrot', args: `"${filepath}"` },
      { cmd: 'import', args: `-window root "${filepath}"` } // ImageMagick
    ];

    let captured = false;
    for (const tool of tools) {
      try {
        execSync(`${tool.cmd} ${tool.args}`, { timeout: 10000 });
        captured = true;
        break;
      } catch (error) {
        // Try next tool
        continue;
      }
    }

    if (!captured) {
      throw new Error('No supported screenshot tool found (gnome-screenshot, scrot, or ImageMagick)');
    }
  }

  /**
   * Generate screenshot filename
   */
  generateFilename(timestamp, trigger) {
    const dateStr = timestamp.toISOString().replace(/[:.]/g, '-');
    const ext = this.options.format;
    return `screenshot-${dateStr}-${trigger}.${ext}`;
  }

  /**
   * Capture screenshot for incident
   */
  async captureIncidentScreenshot(incidentId, description = 'Incident detected') {
    if (!this.options.enabled) {
      return null;
    }

    return await this.captureScreenshot('incident', {
      incidentId,
      description,
      priority: 'high'
    });
  }

  /**
   * Capture screenshot for anomaly
   */
  async captureAnomalyScreenshot(anomalyType, description = 'Anomaly detected') {
    if (!this.options.enabled) {
      return null;
    }

    return await this.captureScreenshot('anomaly', {
      anomalyType,
      description,
      priority: 'medium'
    });
  }

  /**
   * Clean up old screenshots
   */
  async cleanup() {
    try {
      const cutoffTime = new Date(Date.now() - (this.options.retentionHours * 60 * 60 * 1000));
      
      // Read directory contents
      const files = await fs.readdir(this.options.screenshotDir);
      let deletedCount = 0;

      for (const file of files) {
        if (!file.startsWith('screenshot-')) continue;

        const filepath = path.join(this.options.screenshotDir, file);
        try {
          const stats = await fs.stat(filepath);
          
          if (stats.mtime < cutoffTime) {
            await fs.unlink(filepath);
            deletedCount++;
            
            // Remove from history
            this.screenshotHistory = this.screenshotHistory.filter(
              item => item.filename !== file
            );
          }
        } catch (error) {
          // File might have been deleted already, continue
          continue;
        }
      }

      if (deletedCount > 0) {
        this.logger.info('application', `Cleaned up ${deletedCount} old screenshots`, {
          retentionHours: this.options.retentionHours,
          remainingFiles: files.length - deletedCount
        });
      }

    } catch (error) {
      this.logger.logException(error, {
        operation: 'cleanupScreenshots',
        component: 'ScreenshotLogger'
      });
    }
  }

  /**
   * Get screenshot history
   */
  getHistory(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.screenshotHistory.filter(screenshot => 
      new Date(screenshot.timestamp) > cutoff
    );
  }

  /**
   * Get screenshots for specific incident
   */
  getIncidentScreenshots(incidentId) {
    return this.screenshotHistory.filter(screenshot => 
      screenshot.metadata?.incidentId === incidentId
    );
  }

  /**
   * Get storage usage
   */
  async getStorageUsage() {
    try {
      const files = await fs.readdir(this.options.screenshotDir);
      let totalSize = 0;
      let screenshotCount = 0;

      for (const file of files) {
        if (file.startsWith('screenshot-')) {
          const filepath = path.join(this.options.screenshotDir, file);
          const stats = await fs.stat(filepath);
          totalSize += stats.size;
          screenshotCount++;
        }
      }

      return {
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        fileCount: screenshotCount,
        averageSizeKB: screenshotCount > 0 ? Math.round(totalSize / screenshotCount / 1024) : 0,
        directory: this.options.screenshotDir
      };
    } catch (error) {
      this.logger.logException(error, {
        operation: 'getStorageUsage',
        component: 'ScreenshotLogger'
      });
      return { error: 'Failed to calculate storage usage' };
    }
  }

  /**
   * Enable screenshot logging temporarily
   */
  enableTemporary(durationMinutes = 60) {
    if (this.options.enabled) {
      this.logger.warn('application', 'Screenshot logging already enabled');
      return;
    }

    this.options.enabled = true;
    this.start();

    // Auto-disable after duration
    setTimeout(() => {
      this.options.enabled = false;
      this.stop();
      this.logger.info('application', `Temporary screenshot logging disabled after ${durationMinutes} minutes`);
    }, durationMinutes * 60 * 1000);

    this.logger.info('application', `Screenshot logging enabled temporarily for ${durationMinutes} minutes`);
  }

  /**
   * Check if screenshot logging is currently active
   */
  isActive() {
    return this.options.enabled && (this.intervalId !== null || this.options.onlyOnEvents);
  }
}

module.exports = ScreenshotLogger;