/**
 * Windows Monitoring Provider
 * Platform-specific system monitoring implementation for Windows
 */

const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const { MonitoringDataInterface } = require('../../core/interfaces');

const execAsync = util.promisify(exec);

class WindowsMonitoringProvider {
  constructor() {
    this.platform = 'windows';
    this.logger = null;
  }

  /**
   * Inject logger for structured logging
   */
  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Get comprehensive system monitoring data
   * (Alias for compatibility with MonitoringCore)
   */
  async getSystemMetrics() {
    return await this.getSystemStats();
  }

  /**
   * Get network information (alias for getNetworkStats)
   */
  async getNetworkInfo() {
    return await this.getNetworkStats();
  }

  /**
   * Get application monitoring data (alias for getProcessInfo)
   */
  async getApplicationData() {
    return await this.getProcessInfo();
  }

  /**
   * Get comprehensive system monitoring data
   */
  async getSystemStats() {
    const data = new MonitoringDataInterface();
    
    try {
      // Get all monitoring data in parallel for better performance
      const [cpuData, memoryData, diskData, networkData, processData] = await Promise.all([
        this.getCPUUsage().catch(() => ({ usage: 0, cores: os.cpus().length, temperature: 0 })),
        this.getMemoryUsage().catch(() => ({ usage: 0, total: os.totalmem(), available: os.freemem(), used: 0 })),
        this.getDiskUsage().catch(() => ({ usage: 0, total: 0, available: 0, used: 0 })),
        this.getNetworkStats().catch(() => ({ interfaces: [], primaryIP: null, connectivity: false })),
        this.getProcessInfo().catch(() => [])
      ]);

      // Populate system data
      data.system.cpu = cpuData;
      data.system.memory = memoryData;
      data.system.disk = diskData;
      data.system.uptime = this.getSystemUptime();
      data.system.load = { 1: 0, 5: 0, 15: 0 }; // Windows doesn't have load averages like Unix

      // Populate network data
      data.network = networkData;

      // Populate applications data
      data.applications = processData;

      // Get display information
      data.displays = await this.getDisplayInfo();

      data.timestamp = new Date().toISOString();

      return data;
    } catch (error) {
      if (this.logger) {
        await this.logger.monitoring(3, 'Failed to get Windows system stats', {
          error: error.message,
          stack: error.stack
        });
      }
      
      // Return basic data even if detailed monitoring fails
      data.system.uptime = this.getSystemUptime();
      data.timestamp = new Date().toISOString();
      return data;
    }
  }

  /**
   * Get CPU usage information using Windows Performance Counters
   */
  async getCPUUsage() {
    try {
      // Get CPU usage using PowerShell (more reliable than WMIC)
      const { stdout } = await execAsync('powershell -Command "Get-WmiObject -Class Win32_Processor | Select-Object -ExpandProperty LoadPercentage"', { shell: true });
      
      let cpuUsage = 0;
      const usage = stdout.trim();
      if (usage && !isNaN(parseInt(usage))) {
        cpuUsage = parseInt(usage);
      }

      // Get CPU core count
      const cores = os.cpus().length;

      // Get CPU temperature (if available through PowerShell WMI)
      let temperature = 0;
      try {
        const { stdout: tempOutput } = await execAsync(
          `powershell -Command "Get-WmiObject -Namespace 'root/WMI' -Class MSAcpi_ThermalZoneTemperature | Select-Object -First 1 | ForEach-Object { ($_.CurrentTemperature / 10) - 273.15 }"`
        );
        const tempMatch = tempOutput.trim();
        if (tempMatch && !isNaN(parseFloat(tempMatch))) {
          temperature = Math.round(parseFloat(tempMatch));
        }
      } catch (tempError) {
        // Temperature monitoring not available on all systems
        temperature = 0;
      }

      return {
        usage: cpuUsage,
        cores: cores,
        temperature: temperature
      };
    } catch (error) {
      console.warn('Failed to get CPU usage:', error.message);
      return {
        usage: 0,
        cores: os.cpus().length,
        temperature: 0
      };
    }
  }

  /**
   * Get memory usage information
   */
  async getMemoryUsage() {
    try {
      // Get total and available memory using PowerShell
      const { stdout } = await execAsync('powershell -Command "Get-WmiObject -Class Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory | ConvertTo-Json"', { shell: true });
      
      let totalMemory = 0;
      let freeMemory = 0;

      try {
        const memoryData = JSON.parse(stdout.trim());
        totalMemory = parseInt(memoryData.TotalVisibleMemorySize) * 1024; // Convert from KB to bytes
        freeMemory = parseInt(memoryData.FreePhysicalMemory) * 1024; // Convert from KB to bytes
      } catch (parseError) {
        throw new Error('Failed to parse memory data');
      }

      const usedMemory = totalMemory - freeMemory;
      const usage = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0;

      return {
        usage: usage,
        total: totalMemory,
        available: freeMemory,
        used: usedMemory
      };
    } catch (error) {
      console.warn('Failed to get memory usage:', error.message);
      // Fallback to Node.js os module
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      return {
        usage: Math.round((usedMemory / totalMemory) * 100),
        total: totalMemory,
        available: freeMemory,
        used: usedMemory
      };
    }
  }

  /**
   * Get disk usage information for system drive
   */
  async getDiskUsage() {
    try {
      // Get disk space for C: drive using wmic
      const { stdout } = await execAsync('wmic logicaldisk where size!=0 get size,freespace,caption /value');
      
      const lines = stdout.split('\n');
      let totalSpace = 0;
      let freeSpace = 0;
      let isSystemDrive = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('Caption=C:')) {
          isSystemDrive = true;
        } else if (isSystemDrive && line.includes('FreeSpace=')) {
          const match = line.match(/FreeSpace=(\d+)/);
          if (match) {
            freeSpace = parseInt(match[1]);
          }
        } else if (isSystemDrive && line.includes('Size=')) {
          const match = line.match(/Size=(\d+)/);
          if (match) {
            totalSpace = parseInt(match[1]);
          }
          break; // We have all data for C: drive
        }
      }

      const usedSpace = totalSpace - freeSpace;
      const usage = totalSpace > 0 ? Math.round((usedSpace / totalSpace) * 100) : 0;

      return {
        usage: usage,
        total: totalSpace,
        available: freeSpace,
        used: usedSpace
      };
    } catch (error) {
      console.warn('Failed to get disk usage:', error.message);
      return {
        usage: 0,
        total: 0,
        available: 0,
        used: 0
      };
    }
  }

  /**
   * Get network interface information
   */
  async getNetworkStats() {
    try {
      // Get network adapter information
      const { stdout } = await execAsync('wmic path Win32_NetworkAdapter where "NetConnectionStatus=2" get Name,NetConnectionID /value');
      
      const interfaces = [];
      const lines = stdout.split('\n');
      let currentInterface = {};

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('Name=')) {
          const match = trimmedLine.match(/Name=(.+)/);
          if (match) {
            currentInterface.name = match[1];
          }
        } else if (trimmedLine.includes('NetConnectionID=')) {
          const match = trimmedLine.match(/NetConnectionID=(.+)/);
          if (match) {
            currentInterface.id = match[1];
            if (currentInterface.name) {
              interfaces.push({ ...currentInterface });
            }
            currentInterface = {};
          }
        }
      }

      // Get primary IP address
      let primaryIP = null;
      try {
        const { stdout: ipOutput } = await execAsync('ipconfig | findstr "IPv4"');
        const ipMatch = ipOutput.match(/IPv4 Address[.\s]*:\s*([0-9.]+)/);
        if (ipMatch) {
          primaryIP = ipMatch[1];
        }
      } catch (ipError) {
        console.warn('Failed to get primary IP:', ipError.message);
      }

      // Test connectivity (simple ping to Google DNS)
      let connectivity = false;
      try {
        await execAsync('ping -n 1 -w 1000 8.8.8.8');
        connectivity = true;
      } catch (pingError) {
        connectivity = false;
      }

      return {
        interfaces: interfaces,
        primaryIP: primaryIP,
        connectivity: connectivity
      };
    } catch (error) {
      console.warn('Failed to get network stats:', error.message);
      return {
        interfaces: [],
        primaryIP: null,
        connectivity: false
      };
    }
  }

  /**
   * Get running process information
   */
  async getProcessInfo() {
    try {
      // Get process list with memory usage using PowerShell
      const { stdout } = await execAsync('powershell -Command "Get-Process | Select-Object Name,Id,WorkingSet | ConvertTo-Json"', { shell: true });
      
      const processes = [];
      
      try {
        const processData = JSON.parse(stdout.trim());
        const processArray = Array.isArray(processData) ? processData : [processData];

        for (const proc of processArray) {
          if (proc.Name && proc.Id && proc.WorkingSet) {
            processes.push({
              name: proc.Name,
              pid: proc.Id,
              memory: proc.WorkingSet,
              status: 'running',
              cpu: 0 // CPU percentage not available through this method
            });
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse process data:', parseError.message);
      }

      // Sort by memory usage (descending) and limit to top 20
      processes.sort((a, b) => b.memory - a.memory);
      return processes.slice(0, 20);
    } catch (error) {
      console.warn('Failed to get process info:', error.message);
      return [];
    }
  }

  /**
   * Get display information
   */
  async getDisplayInfo() {
    try {
      // Get display information using wmic
      const { stdout } = await execAsync('wmic desktopmonitor get ScreenHeight,ScreenWidth /value');
      
      const displays = [];
      const lines = stdout.split('\n');
      let currentDisplay = {};

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('ScreenHeight=')) {
          const match = trimmedLine.match(/ScreenHeight=(\d+)/);
          if (match) {
            currentDisplay.height = parseInt(match[1]);
          }
        } else if (trimmedLine.includes('ScreenWidth=')) {
          const match = trimmedLine.match(/ScreenWidth=(\d+)/);
          if (match) {
            currentDisplay.width = parseInt(match[1]);
            if (currentDisplay.height) {
              displays.push({
                width: currentDisplay.width,
                height: currentDisplay.height,
                primary: displays.length === 0 // First display is primary
              });
            }
            currentDisplay = {};
          }
        }
      }

      return displays.length > 0 ? displays : [{ width: 1920, height: 1080, primary: true }];
    } catch (error) {
      console.warn('Failed to get display info:', error.message);
      return [{ width: 1920, height: 1080, primary: true }];
    }
  }

  /**
   * Get system uptime
   */
  getSystemUptime() {
    const uptime = os.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const formatted = `${hours}h ${minutes}m ${seconds}s`;
    
    return {
      seconds: uptime,
      formatted: formatted
    };
  }

  /**
   * Get detailed system information
   */
  async getDetailedSystemInfo() {
    try {
      const [systemInfo, processorInfo, memoryInfo] = await Promise.all([
        execAsync('systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Model" /C:"System Type" /C:"Total Physical Memory"'),
        execAsync('wmic cpu get Name,NumberOfCores,NumberOfLogicalProcessors /value'),
        execAsync('wmic computersystem get TotalPhysicalMemory /value')
      ]);

      // Parse system info
      const sysLines = systemInfo.stdout.split('\n');
      const osName = sysLines.find(line => line.includes('OS Name'))?.split(':')[1]?.trim() || 'Windows';
      const osVersion = sysLines.find(line => line.includes('OS Version'))?.split(':')[1]?.trim() || 'Unknown';
      const systemModel = sysLines.find(line => line.includes('System Model'))?.split(':')[1]?.trim() || 'Unknown';
      const systemType = sysLines.find(line => line.includes('System Type'))?.split(':')[1]?.trim() || 'Unknown';

      // Parse processor info
      const procLines = processorInfo.stdout.split('\n');
      const processorName = procLines.find(line => line.includes('Name='))?.replace('Name=', '').trim() || 'Unknown';
      const coreCount = procLines.find(line => line.includes('NumberOfCores='))?.replace('NumberOfCores=', '').trim() || '0';
      const logicalProcessors = procLines.find(line => line.includes('NumberOfLogicalProcessors='))?.replace('NumberOfLogicalProcessors=', '').trim() || '0';

      // Parse memory info
      const memLines = memoryInfo.stdout.split('\n');
      const totalMemoryMatch = memLines.find(line => line.includes('TotalPhysicalMemory='))?.match(/TotalPhysicalMemory=(\d+)/);
      const totalMemory = totalMemoryMatch ? parseInt(totalMemoryMatch[1]) : 0;

      return {
        os: {
          name: osName,
          version: osVersion,
          architecture: systemType
        },
        system: {
          model: systemModel,
          hostname: os.hostname(),
          uptime: this.getSystemUptime()
        },
        processor: {
          name: processorName,
          cores: parseInt(coreCount),
          logicalProcessors: parseInt(logicalProcessors)
        },
        memory: {
          total: totalMemory,
          totalFormatted: this.formatBytes(totalMemory)
        }
      };
    } catch (error) {
      console.warn('Failed to get detailed system info:', error.message);
      return {
        os: { name: 'Windows', version: 'Unknown', architecture: 'Unknown' },
        system: { model: 'Unknown', hostname: os.hostname(), uptime: this.getSystemUptime() },
        processor: { name: 'Unknown', cores: os.cpus().length, logicalProcessors: os.cpus().length },
        memory: { total: os.totalmem(), totalFormatted: this.formatBytes(os.totalmem()) }
      };
    }
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get current Windows services status
   */
  async getServicesStatus() {
    try {
      const { stdout } = await execAsync('sc query state= all | findstr "SERVICE_NAME STATE"');
      const lines = stdout.split('\n');
      const services = [];

      for (let i = 0; i < lines.length; i += 2) {
        if (i + 1 < lines.length) {
          const serviceNameLine = lines[i].trim();
          const stateLine = lines[i + 1].trim();

          const nameMatch = serviceNameLine.match(/SERVICE_NAME:\s*(.+)/);
          const stateMatch = stateLine.match(/STATE\s*:\s*\d+\s+(.+)/);

          if (nameMatch && stateMatch) {
            services.push({
              name: nameMatch[1],
              state: stateMatch[1].trim()
            });
          }
        }
      }

      return services;
    } catch (error) {
      console.warn('Failed to get services status:', error.message);
      return [];
    }
  }

  /**
   * Monitor specific applications by name
   */
  async monitorApplications(appNames = []) {
    if (appNames.length === 0) {
      return [];
    }

    const results = [];
    
    for (const appName of appNames) {
      try {
        const { stdout } = await execAsync(`tasklist /fi "imagename eq ${appName}" /fo csv`);
        const lines = stdout.split('\n').filter(line => line.includes(appName));
        
        const isRunning = lines.length > 1; // First line is header
        const processes = [];

        if (isRunning) {
          for (let i = 1; i < lines.length; i++) { // Skip header
            const columns = lines[i].split('","');
            if (columns.length >= 5) {
              const pid = parseInt(columns[1]);
              const memoryStr = columns[4].replace(/"$/, '').replace(/,/g, '');
              const memory = parseInt(memoryStr) * 1024; // Convert KB to bytes

              if (!isNaN(pid) && !isNaN(memory)) {
                processes.push({
                  pid: pid,
                  memory: memory
                });
              }
            }
          }
        }

        results.push({
          name: appName,
          running: isRunning,
          processes: processes,
          processCount: processes.length
        });
      } catch (error) {
        results.push({
          name: appName,
          running: false,
          processes: [],
          processCount: 0,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = WindowsMonitoringProvider;