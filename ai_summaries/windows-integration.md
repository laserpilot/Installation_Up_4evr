# Windows Integration Plan for Installation Up 4evr

## Overview
This document outlines the implementation plan for adding Windows support to the Installation Up 4evr automation tool. The tool currently supports macOS only but has excellent platform abstraction infrastructure that makes Windows integration straightforward.

## Current Architecture Analysis
- **Platform Abstraction**: Complete system in `backend/src/core/platform-manager.js`
- **macOS Implementation**: Full implementation in `backend/src/platform/macos/`
- **PM2 Process Management**: Cross-platform compatible (keep as-is)
- **Web Frontend**: Platform-agnostic (no changes needed)
- **Server**: Modern platform-aware architecture with legacy fallback

## Windows Integration Strategy

### Phase 1: Core Platform Implementation

#### 1.1 Windows Platform Structure
```
backend/src/platform/windows/
├── system-manager.js      # Windows system configuration
├── monitoring-provider.js # Windows system monitoring
└── process-manager.js     # PM2 wrapper (minimal changes)
```

#### 1.2 System Preferences Translation Table

| macOS Setting | macOS Command | Windows Equivalent | Windows Command |
|---------------|---------------|-------------------|-----------------|
| **Power Management** | | | |
| Screen Sleep | `pmset -c displaysleep 0` | Monitor timeout | `powercfg -change -monitor-timeout-ac 0` |
| Computer Sleep | `pmset -c sleep 0` | System standby | `powercfg -change -standby-timeout-ac 0` |
| Hibernate | `pmset -c hibernate 0` | Hibernate off | `powercfg -hibernate off` |
| Auto Restart | `systemsetup -setrestartfreeze on` | Auto restart | Registry: `HKLM\SYSTEM\CurrentControlSet\Control\CrashControl` |
| **UI Settings** | | | |
| Hide Desktop Icons | `defaults write com.apple.finder CreateDesktop -bool false` | Hide desktop icons | Registry: `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideIcons` |
| Auto-hide Dock | `defaults write com.apple.dock autohide -bool true` | Auto-hide Taskbar | Registry: `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\StuckRects3` |
| Hide Menu Bar | `defaults write NSGlobalDomain _HIHideMenuBar -bool true` | Full Screen Mode | Registry: `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced` |
| **Notifications** | | | |
| Do Not Disturb | `defaults write com.apple.ncprefs doNotDisturb -bool true` | Focus Assist | Registry: `HKCU\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings` |
| **Security** | | | |
| Disable Gatekeeper | `spctl --master-disable` | Disable SmartScreen | Registry: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer` |

### Phase 2: Implementation Details

#### 2.1 Windows Dependencies
```json
{
  "windows-specific": {
    "winreg": "^1.2.4",
    "node-powershell": "^4.0.0", 
    "elevate": "^1.2.0",
    "node-windows": "^1.0.0-beta.8"
  }
}
```

#### 2.2 Windows System Manager Structure
```javascript
class WindowsSystemManager extends SystemManagerInterface {
  constructor() {
    super();
    this.platform = 'windows';
    this.settings = this.initializeWindowsSettings();
  }

  // Core methods to implement:
  async getSystemInfo()           // Windows version, specs
  async applySettings(keys)       // Registry/PowerShell execution
  async verifySettings(keys)      // Status verification
  async revertSettings(keys)      // Restore defaults
  async executePowerShell(cmd)    // PowerShell with UAC
  async setRegistryValue(path, key, value, type)  // Registry operations
}
```

#### 2.3 Windows-Specific Settings Implementation

**Power Management:**
```javascript
powerSettings: {
  displaySleep: {
    name: 'Display Sleep',
    description: 'Set display sleep to Never',
    command: 'powercfg -change -monitor-timeout-ac 0',
    revert: 'powercfg -change -monitor-timeout-ac 10',
    verify: 'powercfg /query SCHEME_CURRENT SUB_VIDEO VIDEOIDLE',
    category: 'power'
  },
  computerSleep: {
    name: 'Computer Sleep', 
    description: 'Set computer sleep to Never',
    command: 'powercfg -change -standby-timeout-ac 0',
    revert: 'powercfg -change -standby-timeout-ac 30',
    verify: 'powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE',
    category: 'power'
  }
}
```

**Registry Operations:**
```javascript
uiSettings: {
  hideDesktopIcons: {
    name: 'Hide Desktop Icons',
    description: 'Hide desktop icons for cleaner installation appearance',
    command: async () => {
      await this.setRegistryValue(
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
        'HideIcons', 1, 'REG_DWORD'
      );
      await this.restartExplorer();
    },
    verify: async () => {
      return await this.getRegistryValue(
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
        'HideIcons'
      );
    },
    category: 'ui'
  }
}
```

### Phase 3: System Monitoring

#### 3.1 Windows Performance Counters
```javascript
class WindowsMonitoringProvider extends MonitoringProviderInterface {
  async getSystemStats() {
    return {
      cpu: await this.getCPUUsage(),      // Win32_PerfRawData_PerfOS_Processor
      memory: await this.getMemoryUsage(), // Win32_OperatingSystem
      disk: await this.getDiskUsage(),     // Win32_LogicalDisk
      network: await this.getNetworkStats() // Win32_PerfRawData_Tcpip_NetworkInterface
    };
  }

  async getCPUUsage() {
    // Use WMI queries or Windows Performance Toolkit
    const wmi = require('node-wmi');
    return wmi.Query({
      class: 'Win32_PerfRawData_PerfOS_Processor',
      where: "Name='_Total'"
    });
  }
}
```

### Phase 4: Platform Factory Updates

#### 4.1 Interface Updates
```javascript
// backend/src/core/interfaces.js
static createSystemManager() {
  const platform = this.getPlatform();
  switch (platform) {
    case 'darwin': 
      return new MacOSSystemManager();
    case 'win32':   // Add Windows support
      return new WindowsSystemManager();
    case 'linux':   // Future expansion
      return new LinuxSystemManager();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

static getPlatform() {
  return process.platform; // 'darwin', 'win32', 'linux'
}
```

### Phase 5: Server Compatibility

#### 5.1 Path Handling Fix
```javascript
// backend/server.js - Fix Windows path issues
let frontendPath;
if (process.platform === 'win32') {
  frontendPath = path.resolve(__dirname, '..', 'frontend');
} else {
  frontendPath = path.join(__dirname, '../frontend');
}
```

#### 5.2 Command Execution Wrapper
```javascript
// Utility for cross-platform command execution
const execCommand = (command) => {
  if (process.platform === 'win32') {
    // Use PowerShell or cmd.exe
    return execAsync(`powershell.exe -Command "${command}"`);
  } else {
    // Use bash/sh
    return execAsync(command);
  }
};
```

## Implementation Roadmap

### Sprint 1: Foundation (Week 1)
- [x] Create windows-integration.md documentation
- [ ] Create Windows platform directory structure
- [ ] Implement basic WindowsSystemManager class
- [ ] Update PlatformFactory for Windows detection
- [ ] Add Windows dependencies to package.json

### Sprint 2: Core Settings (Week 2)  
- [ ] Implement Windows power management settings
- [ ] Implement Windows UI settings (taskbar, desktop, notifications)
- [ ] Add Registry operation utilities
- [ ] Add PowerShell execution with UAC elevation

### Sprint 3: Monitoring & Testing (Week 3)
- [ ] Implement Windows monitoring provider
- [ ] Create Windows-specific test suite
- [ ] Fix server path handling for Windows
- [ ] Test PM2 integration on Windows

### Sprint 4: Polish & Documentation (Week 4)
- [ ] Windows installation/setup scripts
- [ ] Complete documentation updates
- [ ] Performance optimization
- [ ] Windows-specific error handling

## Technical Considerations

### Windows-Specific Challenges
1. **UAC Elevation**: More complex than macOS sudo - requires different approach
2. **Registry Access**: Need proper permissions and error handling
3. **PowerShell vs CMD**: Different execution environments
4. **File Paths**: Backslashes, drive letters, Windows-specific locations
5. **Windows Services**: If we need system-level integration

### Testing Strategy
1. **Development Environment**: Windows 10/11 with Node.js and PM2
2. **Virtual Machines**: Multiple Windows versions for compatibility
3. **Automated Testing**: Windows-specific test cases
4. **Manual Testing**: Real-world installation scenarios

### Security Considerations
1. **Registry Modifications**: Backup and restore capabilities
2. **System Changes**: Reversible operations only
3. **UAC Prompts**: Clear user consent for administrative actions
4. **Antivirus Compatibility**: Ensure system changes don't trigger false positives

## Success Criteria

### Minimum Viable Product (MVP)
- [ ] Server starts successfully on Windows
- [ ] Basic power management settings work
- [ ] PM2 process management functional
- [ ] Web interface accessible and functional
- [ ] At least 5 core system settings implemented

### Full Feature Parity
- [ ] All macOS system settings have Windows equivalents
- [ ] System monitoring works on Windows
- [ ] Windows-specific optimizations implemented
- [ ] Complete test coverage for Windows platform
- [ ] Windows installation package available

## Future Enhancements
- Linux platform support using same architecture
- Windows-specific features (Windows Services, Task Scheduler integration)
- Advanced Windows monitoring (Event Viewer integration)
- Windows domain/enterprise features
- Chocolatey package manager integration

## Resources
- [Windows Registry Reference](https://docs.microsoft.com/en-us/windows/win32/sysinfo/registry)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)
- [Windows Management Instrumentation](https://docs.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page)
- [Node.js Windows Support](https://nodejs.org/en/docs/guides/working-with-different-filesystems/)