# Installation Up 4evr - macOS Automation Tool

**Complete automation solution for Mac-based creative technology installations.**

This guide covers the macOS-specific implementation of the Installation Up 4evr automation tool, including system preferences automation, Launch Agent management, and native app integration.

## 🍎 macOS Requirements

### System Compatibility
- **macOS 10.15+** (Catalina or later)
- **Administrator access** required for system changes
- **Node.js 16+** for web interface
- **Xcode Command Line Tools** (for some features)

### Apple Silicon vs Intel
- **Apple Silicon (M1/M2/M3)**: Fully supported
- **Intel Macs**: Fully supported  
- **Rosetta 2**: Not required - native support for both architectures

### Security Considerations
- **System Integrity Protection (SIP)**: Tool works with SIP enabled
- **Gatekeeper**: Native app handles code signing requirements
- **Privacy Permissions**: Tool requests only necessary permissions

## 🚀 Installation & Setup

Choose your installation method based on your needs:

### Option 1: Standalone Electron App (Recommended - No Dependencies)
**Perfect for: Production installations, non-technical users, isolated systems**

**What you get:**
- Self-contained macOS app (no additional software needed)
- Drag-and-drop installation
- Works immediately on any Mac
- Full automation capabilities included

**Installation:**
1. Download `Installation-Up-4evr.dmg` from releases
2. Open the DMG file
3. Drag the app to Applications folder
4. Double-click to launch
5. Grant permissions when prompted (admin access, accessibility)

**No prerequisites required** - everything is bundled in the app.

### Option 2: Web Interface (For Developers & Remote Management)
**Perfect for: Development, remote installations, multiple computer management**

**What you get:**
- Browser-based interface
- Remote access capabilities  
- Development and testing features
- API access for custom integrations

**Prerequisites (Fresh macOS Installation):**
```bash
# 1. Install Xcode Command Line Tools (required for npm packages)
xcode-select --install

# 2. Install Node.js (two options):

# Option A: Download from nodejs.org
# Visit https://nodejs.org and download the LTS version
# Run the installer and follow prompts

# Option B: Using Homebrew (if you prefer command line)
# First install Homebrew:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Then install Node.js:
brew install node

# 3. Verify installation
node --version    # Should show v16+ 
npm --version     # Should show npm version
```

**Setup after prerequisites:**
```bash
# Clone or download the repository
git clone [repository-url]
cd Installation_Up_4evr

# Install dependencies and start
cd backend
npm install
npm start

# Open browser to http://localhost:3001
```

### Option 3: Development Setup (For Contributors)
**Perfect for: Code contributions, feature development, testing**

**Prerequisites (same as Option 2, plus):**
```bash
# Additional development tools
npm install -g electron

# For building distributable apps
npm install -g electron-builder
```

**Development setup:**
```bash
# Install all dependencies
npm install

# Start development mode
npm run dev
# This launches the Electron app in development mode

# Build production version
npm run build:mac
# Creates distributable .app and .dmg files
```

## 🤔 Which Option Should I Choose?

### Use the **Standalone Electron App** if:
- ✅ You want the simplest installation experience
- ✅ You're setting up a production installation
- ✅ You don't want to install additional software
- ✅ You need a computer that "just works" immediately
- ✅ You're not comfortable with command line tools

### Use the **Web Interface** if:
- ✅ You need to manage the installation remotely
- ✅ You want to access from multiple computers
- ✅ You're comfortable installing Node.js and npm
- ✅ You need the API for custom integrations
- ✅ You plan to develop or customize features

### Use **Development Setup** if:
- ✅ You want to contribute code to the project
- ✅ You need to build custom versions
- ✅ You're testing new features or modifications

## 🛠️ Quick Setup Script (No Installation Required)

**Perfect for: One-time setups, minimal tooling, quick configurations**

Don't want to install any software but still need to configure your Mac for installation use? Use our standalone setup script:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/[your-repo]/Installation_Up_4evr/main/ScriptExamples/installation-setup-mac.sh -o setup-mac.sh
chmod +x setup-mac.sh
./setup-mac.sh
```

**Or download from the repository:**
```bash
# If you already have the repository
cd Installation_Up_4evr/ScriptExamples
./installation-setup-mac.sh
```

### What the Script Does
- ✅ **Disables screensaver** - No screen interruptions
- ✅ **Prevents sleep** - Display and computer stay awake
- ✅ **Sets black desktop** - Professional appearance
- ✅ **Disables software updates** - No unexpected updates
- ✅ **Enables auto-restart** - Recover from power failures
- ✅ **Disables Bluetooth setup** - No popup dialogs
- ✅ **Auto-hides menu bar** - Cleaner fullscreen experience
- ✅ **Disables App Nap** - Full performance for all apps
- ✅ **Verification report** - Confirms what was applied

### What You Still Need to Do Manually
The script handles system-level settings, but you'll still need to:

1. **Set up automatic login:**
   - System Preferences > Users & Groups > Login Options
   - Enable "Automatic login" for your user
   - **Use a standard (non-admin) user for security**

2. **Configure application auto-start:**
   - System Preferences > Users & Groups > Login Items
   - OR create Launch Agents for more reliable startup

3. **Test your setup:**
   - Restart and verify everything works
   - Test power failure recovery if possible

### Script Features
- **Safe execution** - Only modifies known safe settings
- **Colorized output** - Clear success/warning/error messages
- **Verification** - Checks that settings were applied correctly
- **Detailed logging** - Saves results to desktop for reference
- **No installation required** - Just download and run

This script provides the core system configuration from the full automation tool without requiring any software installation.

## 🎛️ macOS System Automation

### Automated System Preferences
The tool automates these critical macOS settings:

| Setting | Purpose | Method |
|---------|---------|---------|
| **Screensaver** → Never | Prevent screen interruption | `defaults -currentHost write com.apple.screensaver idleTime 0` |
| **Display Sleep** → Never | Keep displays active | `sudo pmset -a displaysleep 0` |
| **Computer Sleep** → Never | Prevent system sleep | `sudo pmset -a sleep 0` |
| **Auto Restart** → On | Recover from power failures | `sudo pmset -a autorestart 1` |
| **Desktop Background** → Black | Professional appearance | `osascript` desktop picture command |
| **Software Updates** → Disabled | Prevent unexpected updates | `sudo softwareupdate --schedule off` |
| **Bluetooth Setup** → Disabled | Prevent setup dialogs | Bluetooth preferences modification |
| **Menu Bar** → Auto-hide | Fullscreen app support | System preferences automation |
| **App Nap** → Disabled | Full performance for apps | Per-app settings modification |

### Apple Silicon Specific Features
- **Boot Security**: Handles Apple Silicon boot security requirements
- **Secure Boot**: Compatible with Secure Boot enabled
- **Touch ID/Sudo**: Integrates with Touch ID for sudo operations
- **Rosetta**: Native Apple Silicon builds, no Rosetta required

## 🚀 Launch Agent Management

### What are Launch Agents?
macOS Launch Agents are the native, reliable way to:
- **Start applications automatically** on login
- **Keep applications running** with automatic restart on crash
- **Manage system resources** with proper priority and permissions
- **Handle user sessions** correctly

### Launch Agent Generation
The tool creates properly configured Launch Agents with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <true/>
    </dict>
    <key>Label</key>
    <string>com.installation.myapp</string>
    <key>ProcessType</key>
    <string>Interactive</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/MyApp.app/Contents/MacOS/MyApp</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

### Key Launch Agent Features
- **KeepAlive**: Automatically restart on crash
- **SuccessfulExit**: Allow manual quit during testing
- **ProcessType: Interactive**: Full system resources (not throttled)
- **RunAtLoad**: Start immediately on login
- **Proper Bundle Detection**: Automatically finds app executable paths

### Launch Agent vs PM2 Comparison

| Feature | Launch Agents | PM2 |
|---------|---------------|-----|
| **Installation** | ✅ Built into macOS | ❌ Requires Node.js + npm |
| **App Support** | ✅ Any macOS app | ❌ Node.js apps only |
| **Native Integration** | ✅ Full macOS integration | ❌ External dependency |
| **Setup Complexity** | ❌ XML configuration | ✅ Simple commands |
| **Monitoring** | ❌ Basic logging | ✅ Rich dashboard |
| **Clustering** | ❌ Single instance | ✅ Multiple instances |

**Recommendation**: Use Launch Agents for maximum reliability and native integration. Use PM2 only if you need advanced monitoring for Node.js applications.

## 📋 Installation Profiles (macOS)

### Built-in Mac Profiles

#### 🏛️ Museum Installation
- **System Settings**: Maximum stability, no sleep, minimal UI
- **Security**: Automatic login to standard user
- **Monitoring**: Conservative thresholds, Slack notifications
- **Apps**: Fullscreen presentation apps with auto-restart

#### 🛍️ Retail Display  
- **System Settings**: Commercial-grade reliability
- **Security**: Kiosk mode configurations
- **Monitoring**: Business hours monitoring
- **Apps**: Customer-facing applications

#### 🎨 Art Gallery Kiosk
- **System Settings**: Gallery-appropriate settings
- **Security**: Public access considerations
- **Monitoring**: Artist notification preferences
- **Apps**: Interactive art applications

#### 📊 Trade Show Demo
- **System Settings**: Portable setup optimizations
- **Security**: Temporary network configurations
- **Monitoring**: Event-duration monitoring
- **Apps**: Demo applications with quick setup

#### 🔧 Development
- **System Settings**: Development-friendly configuration
- **Security**: Developer access maintained
- **Monitoring**: Detailed logging for debugging
- **Apps**: Test applications with easy debugging

### Profile Application Process
1. **Select Profile**: Choose from built-in templates or create custom
2. **Review Settings**: Preview all changes before applying
3. **Apply Systematically**: Settings applied in dependency order
4. **Verify Results**: Automatic verification of applied settings
5. **Test Applications**: Launch and test configured apps

## 🖥️ Native Electron App Features

### Why Use the Native App?
- **Real File Access**: Proper .app bundle detection and analysis
- **Secure Sudo**: Uses macOS native password dialogs
- **No Browser Limitations**: Full filesystem and system access
- **Better Performance**: Native rendering and system integration
- **Offline Operation**: No web server dependency

### Electron App Capabilities
- **Drag & Drop**: Drop .app files directly onto interface
- **Bundle Analysis**: Automatic detection of app executable paths
- **Permission Handling**: Proper macOS permission requests
- **System Integration**: Native look and feel
- **Secure Operations**: Encrypted inter-process communication

### Electron vs Web Interface

| Feature | Electron App | Web Interface |
|---------|--------------|---------------|
| **File Access** | ✅ Full filesystem | ❌ Browser sandbox |
| **Sudo Handling** | ✅ Native dialogs | ❌ Terminal required |
| **App Detection** | ✅ Real bundle analysis | ❌ Path guessing |
| **Performance** | ✅ Native rendering | ❌ Browser overhead |
| **Remote Access** | ❌ Local only | ✅ Network accessible |
| **Setup Complexity** | ✅ Simple install | ✅ Simple install |

## 🔒 Security & Permissions

### Working with macOS Security
The automation tool is designed to work securely within macOS restrictions:

#### System Integrity Protection (SIP)
- **Status**: Tool works with SIP **enabled** (recommended)
- **No SIP Disabling**: All features work without compromising security
- **SIP Detection**: Tool detects and reports SIP status
- **Safe Operations**: Only modifies user-level and safe system settings

#### Required Permissions
- **Administrator Access**: Required for system-wide settings
- **Accessibility**: For some system preference automation
- **Full Disk Access**: For comprehensive monitoring (optional)
- **Network**: For remote monitoring and notifications

#### Security Best Practices
- **Standard User**: Always use standard (non-admin) user for auto-login
- **Network Isolation**: Consider isolated networks for installations
- **Regular Updates**: Keep automation tool updated
- **Monitoring**: Enable security event monitoring

## 📊 Monitoring & Remote Control

### Real-time System Monitoring
- **System Resources**: CPU, memory, disk usage with configurable thresholds
- **Application Status**: Process monitoring for configured applications
- **Display Status**: Monitor connected displays and resolutions
- **Network Status**: Connection monitoring and IP tracking
- **Hardware Health**: Temperature and power status (where available)

### Remote Control Commands

| Command | Function | Use Case |
|---------|----------|----------|
| **App Control** | start/stop/restart apps | Fix crashed applications |
| **Volume Control** | Adjust system volume | Audio level management |
| **Display Control** | Sleep/wake displays | Energy management |
| **Screenshot** | Capture current state | Visual status checking |
| **System Restart** | Remote reboot | Maintenance operations |
| **Emergency Stop** | Stop all monitored apps | Emergency situations |

### Notification Channels
- **Slack Integration**: Rich formatted alerts with system data
- **Discord Webhooks**: Team notifications with embed support
- **Generic Webhooks**: Custom integrations with any service
- **Email Support**: Traditional email notifications (configurable)

## 🧪 Testing & Validation

### Automated Testing
```bash
cd backend
npm run test:system-prefs   # Test system preference automation
npm run test:launch-agents  # Test Launch Agent creation/management
npm run test:profiles      # Test profile system
npm run test:monitoring    # Test monitoring features
```

### Manual Testing Checklist
- [ ] System preferences apply correctly
- [ ] Launch Agents start applications on login
- [ ] Applications restart automatically after crash
- [ ] Monitoring detects application failures
- [ ] Remote control commands work properly
- [ ] Notifications send to configured channels
- [ ] Profile import/export functions correctly

### Apple Silicon Testing
- [ ] Native Apple Silicon builds work correctly
- [ ] No Rosetta dependencies
- [ ] Touch ID integration functions
- [ ] Apple Silicon specific features enabled

## 🔧 Development & Customization

### Adding New System Preferences
Edit `backend/modules/system-prefs.js`:
```javascript
const newSetting = {
    id: 'my-setting',
    name: 'My Custom Setting',
    description: 'What this setting does',
    verify: () => { /* check current state */ },
    apply: () => { /* apply setting */ }
};
```

### Creating Custom Profiles
```javascript
const customProfile = {
    name: "My Installation Type",
    description: "Custom profile description",
    category: "Custom",
    settings: ["screensaver-never", "sleep-never"],
    apps: [
        {
            name: "My App",
            path: "/Applications/MyApp.app",
            keepAlive: true
        }
    ]
};
```

### Extending Monitoring
Add new monitoring metrics in `backend/modules/monitoring.js`:
```javascript
const customMetric = {
    name: 'custom-metric',
    collect: () => { /* gather data */ },
    threshold: { warning: 80, critical: 95 },
    format: (value) => { /* format for display */ }
};
```

## 🚀 Production Deployment

### Building for Distribution
```bash
# Create production Electron app
npm run build:mac

# Output files:
# dist/Installation-Up-4evr.app      # Native macOS app
# dist/Installation-Up-4evr.dmg      # Installer disk image
```

### Deployment Best Practices
- **Code Signing**: Sign the Electron app for distribution
- **Notarization**: Notarize for macOS Gatekeeper compatibility  
- **Testing**: Test on clean macOS installations
- **Documentation**: Include setup instructions with deployments
- **Backup**: Create system backup before applying automation

### Server Deployment (Optional)
For centralized management:
```bash
# Deploy web interface to server
cd backend
npm install --production
npm start

# Configure reverse proxy (nginx/Apache)
# Set up SSL certificates
# Configure firewall rules
```

## 🤝 macOS-Specific Contributing

### Development Environment
- **macOS Development**: Xcode Command Line Tools
- **Node.js**: Version 16+ with npm
- **Testing**: Multiple macOS versions (Intel + Apple Silicon)
- **Code Signing**: Apple Developer account for distribution

### Testing Requirements
- Test on both Intel and Apple Silicon Macs
- Verify compatibility with latest macOS versions
- Test with SIP enabled (default configuration)
- Validate with standard user accounts (not admin)

### Pull Request Guidelines
- Include testing on multiple Mac configurations
- Update documentation for any new macOS features
- Ensure compatibility with existing profiles
- Add appropriate error handling for macOS edge cases

---

**This macOS automation tool provides production-ready reliability for creative technology installations while maintaining security best practices and native macOS integration.**