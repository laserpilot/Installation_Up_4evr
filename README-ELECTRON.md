# Installation Up 4evr - Electron App

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for distribution
npm run build:mac
```

## Features

### ✅ Native macOS Integration
- **Real file access** - Browse and select actual .app files
- **Native sudo prompts** - Secure admin privilege escalation
- **System integration** - Works with macOS security features

### ✅ Enhanced UI
- **Drag & drop .app files** - Real file path detection
- **Native file dialogs** - Standard macOS file picker
- **System status indicators** - Live SIP and server status

### ✅ Automated System Preferences
- **12 system settings** from the original README
- **Visual feedback** - See what changed and what failed
- **Security aware** - Handles SIP restrictions gracefully

### ✅ Launch Agent Management
- **Visual plist generator** - No manual XML editing
- **Real-time status** - See which agents are running
- **Full lifecycle** - Create, install, monitor, unload

## Development

```bash
# Start backend server and Electron together
npm run dev

# Test individual modules
cd backend && npm run test:system-prefs
cd backend && npm run test:launch-agents

# Build for production
npm run build:mac
```

## Distribution

The built app will be in `dist/` folder:
- `Installation Up 4evr.app` - Ready to distribute
- `Installation Up 4evr.dmg` - Drag-to-install disk image

## Security Notes

The app requires these permissions:
- **File access** - To read .app bundles and create launch agents
- **Admin privileges** - For system preference changes
- **Automation access** - For AppleScript system integration

All permissions are requested through standard macOS dialogs.

## Project Structure

```
├── electron/                 # Electron main process
│   ├── main.js              # App lifecycle & native APIs
│   ├── preload.js           # Secure renderer bridge
│   └── entitlements.mac.plist # macOS permissions
├── backend/                  # Node.js modules (unchanged)
├── frontend/                 # Web UI (enhanced for Electron)
└── package.json             # Electron build config
```

## Building for Distribution

1. **Development**: `npm run dev`
2. **Build**: `npm run build:mac` 
3. **Distribute**: Share the .dmg file

The app is universal (Intel + Apple Silicon) and doesn't require users to install Node.js or run terminal commands.