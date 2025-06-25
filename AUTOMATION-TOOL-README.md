# Installation Up 4evr - Automation Tool

**A modern web-based tool for automating Mac setup for creative technology installations.**

This tool automates the tedious manual process described in the original README, making it accessible to anyone setting up installation computers.

## 🎯 What This Tool Does

### ✅ **System Preferences Automation**
- **12 key macOS settings** from the original guide
- **Visual checkbox interface** - no more System Preferences hunting
- **Real-time verification** - see what's already configured
- **Safe testing mode** - verify settings before applying

### ✅ **Launch Agent Generator** 
- **Drag & drop .app files** - automatic bundle analysis
- **Visual plist generator** - no manual XML editing
- **Keep-alive configuration** - apps restart automatically when they crash
- **Full lifecycle management** - create, install, monitor, unload

### ✅ **Installation Profiles**
- **Built-in templates** for common scenarios:
  - 🏛️ **Museum Installation** - Public interactive displays
  - 🛍️ **Retail Display** - Commercial environments
  - 🎨 **Art Gallery Kiosk** - Gallery information systems
  - 📊 **Trade Show Demo** - Temporary event installations
  - 🔧 **Development** - Testing setups
- **Custom profiles** - save your own configurations
- **One-click application** - apply entire profiles instantly
- **Export/Import** - share configurations between projects

### ✅ **Monitoring & Remote Control**
- **Real-time monitoring** - CPU, memory, disk, displays, applications
- **Heartbeat system** - uptime tracking with configurable intervals
- **Remote control commands**:
  - 🔄 **App control** - start, stop, restart applications
  - 🖥️ **Display control** - sleep/wake displays
  - 🔊 **Volume control** - adjust system volume
  - 📸 **Screenshots** - capture current state remotely
  - ⚡ **Emergency stop** - stop all monitored applications
  - 🔧 **System restart** - remote system reboot
- **Health monitoring** - automatic alerts for critical conditions
- **Session management** - secure remote control sessions

### ✅ **Notifications & Logging**
- **Multi-channel notifications**:
  - 📱 **Slack integration** - rich formatted alerts
  - 💬 **Discord webhooks** - team notifications  
  - 🔗 **Generic webhooks** - custom integrations
  - 📧 **Email support** - (configurable)
- **Smart alerting** - CPU/memory/disk thresholds
- **Rate limiting** - prevent notification spam
- **Persistent logging** - file-based log storage
- **Log aggregation** - searchable by time/level

## 🚀 Quick Start

### Web Version
```bash
cd backend
npm install
npm start
# Open http://localhost:3001
```

### Electron App (Recommended)
```bash
npm install
npm run dev
# Native Mac app with file access and sudo handling
```

## 📁 Project Structure

```
├── backend/                  # Node.js automation engine
│   ├── modules/
│   │   ├── system-prefs.js   # System preferences automation
│   │   ├── launch-agents.js  # Launch agent management
│   │   ├── profiles.js       # Installation profiles system
│   │   ├── monitoring.js     # Real-time system monitoring
│   │   ├── remote-control.js # Remote control commands
│   │   └── notifications.js  # Multi-channel notifications
│   ├── templates/            # Built-in profile templates
│   └── server.js            # Express API server
├── frontend/                 # Web interface
│   ├── index.html           # Main UI
│   ├── styles.css           # Apple-style design
│   └── script.js            # Interactive features
├── electron/                 # Electron app wrapper
│   ├── main.js              # Native macOS integration
│   └── preload.js           # Secure API bridge
└── ScriptExamples/          # Original shell scripts (unchanged)
```

## 🎨 Features

### **Beautiful Interface**
- **Apple-style design** with smooth animations
- **Drag-and-drop** for app selection
- **Real-time status indicators** (Server, SIP status)
- **Toast notifications** for user feedback
- **Results console** showing detailed feedback
- **Mobile responsive** design

### **Smart Automation**
- **Bundle analysis** - automatically finds app executables
- **Security awareness** - handles SIP restrictions gracefully
- **Error handling** - clear feedback when things need admin access
- **Verification mode** - test settings without applying changes

### **Profile System**
- **Template library** - proven configurations for different scenarios
- **Custom profiles** - save your own setups
- **Search and filter** - find profiles by category, tags, or name
- **Metadata tracking** - author, creation date, compatibility notes
- **Installation guides** - built-in setup and testing checklists

## 🛠️ How It Works

### 1. **System Preferences**
The tool automates these key settings from the original README:
- Screensaver → Never
- Display/Computer Sleep → Never  
- Auto Restart → On (power failure & freeze)
- Desktop Background → Black
- Software Updates → Disabled
- Bluetooth Setup Assistant → Disabled
- Menu Bar → Auto-hide
- App Nap → Disabled

### 2. **Launch Agents**
Generates proper macOS launch agents with:
- **KeepAlive** - restart apps when they crash
- **SuccessfulExit** - allow manual quit during testing
- **ProcessType: Interactive** - full system resources
- **RunAtLoad** - start on login

### 3. **Installation Profiles**
Pre-configured setups for common scenarios:
- **System settings** selection per use case
- **App configurations** with launch options
- **Installation notes** and testing checklists
- **Export/import** for team sharing

## 🔒 Security & Permissions

### **System Changes Require Admin Access**
The tool properly handles macOS security:
- **SIP awareness** - detects System Integrity Protection status
- **Sudo prompts** - requests admin access only when needed
- **Permission explanations** - clear warnings about what requires privileges
- **Reversible changes** - most settings can be undone

### **Electron App Benefits**
- **Native file access** - real .app bundle detection
- **Secure sudo handling** - uses macOS password dialogs
- **No browser limitations** - full filesystem access

## 📊 API Reference

### **System Preferences**
- `GET /api/system-prefs/settings` - List all available settings
- `POST /api/system-prefs/apply` - Apply selected settings
- `GET /api/system-prefs/verify` - Check current status
- `GET /api/system-prefs/sip-status` - Check SIP status

### **Launch Agents** 
- `POST /api/launch-agents/create` - Generate plist file
- `POST /api/launch-agents/install` - Create and load agent
- `GET /api/launch-agents/list` - List user agents
- `GET /api/launch-agents/status` - Check running status

### **Profiles**
- `GET /api/profiles` - List saved profiles
- `GET /api/profiles/templates` - Built-in templates
- `POST /api/profiles` - Create new profile
- `POST /api/profiles/:id/apply` - Apply entire profile
- `GET /api/profiles/search` - Search by criteria

### **Monitoring**
- `GET /api/monitoring/status` - Current system status
- `GET /api/monitoring/health` - Health summary
- `POST /api/monitoring/start` - Start monitoring
- `GET /api/monitoring/logs` - Recent log entries
- `POST /api/monitoring/watch-app` - Add app to monitoring

### **Remote Control**
- `POST /api/remote-control/command` - Execute remote command
- `GET /api/remote-control/capabilities` - Available commands
- `POST /api/remote-control/session` - Create control session

### **Notifications**
- `GET /api/notifications/channels` - List notification channels
- `POST /api/notifications/channels` - Add notification channel
- `POST /api/notifications/send` - Send test notification
- `POST /api/notifications/test/:channel` - Test specific channel

## 🎯 Use Cases

### **Museum/Gallery Installations**
- Public-facing interactive displays
- Crash-resistant configuration
- Remote monitoring setup
- Professional presentation standards

### **Retail Environments**
- Customer-facing demonstrations
- Commercial reliability requirements
- Store staff training considerations
- Brand presentation standards

### **Event Installations**
- Trade show demonstrations
- Temporary setup requirements
- Quick deployment needs
- Portable configuration management

### **Development/Testing**
- Prototype installations
- Testing scenarios
- Development environments
- Minimal configuration setups

## 🔧 Development

### **Test Individual Modules**
```bash
cd backend
npm run test:system-prefs
npm run test:launch-agents  
npm run test:profiles
```

### **Build Electron App**
```bash
npm run build:mac
# Creates distributable .app and .dmg
```

### **Add New Profile Templates**
Edit `backend/modules/profiles.js` → `createBuiltInTemplates()`

## 🤝 Contributing

This tool makes the original README guide accessible to non-technical users. Contributions welcome:

- **New profile templates** for different installation scenarios
- **Enhanced UI features** for better user experience
- **Additional system settings** from macOS updates
- **Monitoring features** for installation health checking

## 📄 License

MIT License - Same as the original Installation Up 4evr guide.

---

**This automation tool transforms the manual Installation Up 4evr guide into a user-friendly application that anyone can use to set up reliable Mac installations for creative technology projects.**