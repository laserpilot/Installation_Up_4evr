# Installation Up 4evr - Automation Tool

**A modern cross-platform tool for automating computer setup for creative technology installations.**

This tool transforms the manual Installation Up 4evr guide into a user-friendly application that automates system configuration, process management, and monitoring for long-running installations.

## 🎯 What This Tool Does

### Core Automation Features
- **System Configuration** - Automate OS settings for 24/7 operation
- **Process Management** - Keep applications running with automatic restart
- **Installation Profiles** - Pre-configured templates for common scenarios  
- **Real-time Monitoring** - Track system health and application status
- **Remote Control** - Manage installations from anywhere
- **Smart Notifications** - Multi-channel alerts for critical events

### Key Benefits
- **Zero Manual Configuration** - No more hunting through system preferences
- **Reliable Operation** - Professional-grade process management
- **Remote Management** - Monitor and control from anywhere
- **Team Collaboration** - Share profiles and configurations
- **Cross-Platform** - Mac and Windows support

## 🚀 Platform Support

| Platform | Status | Quick Start |
|----------|--------|-------------|
| **macOS** | ✅ Production Ready | [Mac Setup Guide →](README-MAC.md) |
| **Windows** | 🚧 In Development | [Windows Guide →](README-WINDOWS.md) |

## 🎨 Interface Options

### Web Interface (Cross-Platform)
```bash
cd backend
npm install && npm start
# Open http://localhost:3001
```
- Works on any platform with Node.js
- Browser-based interface
- Good for remote management

### Native App (Platform-Specific)
- **macOS**: Electron app with native file access and sudo handling
- **Windows**: Native Windows app (in development)

## 📋 Installation Profiles

Pre-built templates for common scenarios:

- 🏛️ **Museum Installation** - Public interactive displays
- 🛍️ **Retail Display** - Commercial environments  
- 🎨 **Art Gallery Kiosk** - Gallery information systems
- 📊 **Trade Show Demo** - Temporary event installations
- 🔧 **Development** - Testing and development setups

Each profile includes:
- **System settings** optimized for the use case
- **Application configurations** with launch options
- **Monitoring setup** with appropriate thresholds
- **Testing checklists** for validation

## 🛠️ Architecture

```
Installation Up 4evr Automation Tool
├── Cross-Platform Core
│   ├── Web Interface (HTML/CSS/JS)
│   ├── API Server (Node.js/Express)
│   ├── Profile System (JSON templates)
│   └── Monitoring Engine
├── Platform-Specific Modules
│   ├── macOS (system-prefs, launch-agents)
│   └── Windows (services, registry) [in development]
└── Native Apps
    ├── macOS (Electron)
    └── Windows [planned]
```

## 🔧 Development

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Platform-specific requirements (see platform guides)

### Quick Development Setup
```bash
# Clone and install
git clone [repository]
cd Installation_Up_4evr
npm install

# Start development server
cd backend && npm start

# For native app development
npm run dev  # macOS Electron
```

### Testing
```bash
cd backend
npm test                    # All tests
npm run test:system-prefs   # Mac system preferences
npm run test:launch-agents  # Mac launch agents  
npm run test:profiles       # Profile system
```

## 🤝 Contributing

We welcome contributions! Focus areas:

### High Priority
- **Windows platform development** - Services, registry, monitoring
- **Profile templates** - New installation scenarios
- **Monitoring features** - Enhanced health checking
- **Documentation** - Platform-specific guides

### Medium Priority  
- **UI enhancements** - Better user experience
- **API extensions** - Additional automation capabilities
- **Testing coverage** - Cross-platform validation

### Guidelines
- Follow existing code patterns
- Add tests for new features
- Update relevant platform documentation
- Test on target platforms before submitting

## 📄 License

MIT License - Same as the original Installation Up 4evr guide.

---

## 📖 Platform-Specific Documentation

👉 **[macOS Setup Guide](README-MAC.md)** - Complete Mac automation setup  
👉 **[Windows Guide](README-WINDOWS.md)** - Windows development status  

For the original manual guide, see the main [Installation Up 4evr README](README.md).