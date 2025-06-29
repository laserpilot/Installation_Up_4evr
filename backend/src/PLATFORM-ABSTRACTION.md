# Platform Abstraction Documentation

## Overview

The platform abstraction layer separates universal functionality from platform-specific implementations, enabling future cross-platform support while maintaining all existing functionality.

## Architecture

```
/src
├── /core (Platform-agnostic)
│   ├── interfaces.js          # Standard interfaces for all platforms
│   ├── platform-manager.js    # Main orchestrator
│   ├── api-manager.js         # Standardized API handling
│   ├── config-manager.js      # Configuration management
│   └── /monitoring
│       └── monitoring-core.js # Universal monitoring logic
├── /platform
│   └── /macos                 # macOS-specific implementations
│       ├── system-manager.js  # macOS system configuration
│       └── monitoring-provider.js # macOS monitoring implementation
└── migration-example.js       # Example server using new architecture
```

## Key Components

### 1. Platform Interfaces (`interfaces.js`)

Defines standard interfaces that all platform implementations must follow:

- **SystemManagerInterface**: System configuration management
- **ProcessManagerInterface**: Application and process management  
- **MonitoringDataInterface**: Standard monitoring data structure
- **PlatformFactory**: Creates appropriate platform-specific implementations

### 2. Platform Manager (`platform-manager.js`)

Main orchestrator that:
- Initializes platform-specific managers
- Provides unified API endpoints
- Handles configuration management
- Manages monitoring system

### 3. API Manager (`api-manager.js`)

Standardizes API responses and error handling:
- **APIResponse**: Consistent response format
- **Middleware support**: Validation, rate limiting, authentication
- **Error handling**: Standardized error formats
- **Data transformation**: Sanitizes and validates data

### 4. Configuration Manager (`config-manager.js`)

Platform-agnostic configuration management:
- **Hierarchical configuration**: Nested settings with dot notation access
- **Auto-persistence**: Automatic saving of configuration changes
- **Import/Export**: Configuration backup and sharing
- **Validation**: Configuration schema validation

## Implementation Guide

### Adding a New Platform

1. **Create platform directory**: `/src/platform/[platform-name]/`

2. **Implement required managers**:
   ```javascript
   // system-manager.js
   class WindowsSystemManager extends SystemManagerInterface {
       async getSystemInfo() { /* Windows-specific implementation */ }
       async applySettings(settings) { /* Windows-specific implementation */ }
       // ... other required methods
   }
   ```

3. **Update PlatformFactory**:
   ```javascript
   static createSystemManager() {
       const platform = this.getPlatform();
       switch (platform) {
           case 'darwin': return new MacOSSystemManager();
           case 'win32': return new WindowsSystemManager(); // New
           case 'linux': return new LinuxSystemManager();   // New
       }
   }
   ```

### Migrating Existing Code

The existing server can be gradually migrated:

1. **Legacy compatibility**: Use existing routes alongside new platform manager
2. **Gradual migration**: Move functionality piece by piece
3. **Configuration migration**: Import existing settings into new config system

Example migration:
```javascript
const PlatformManager = require('./src/core/platform-manager');

// Initialize new platform manager
const platform = new PlatformManager();
await platform.initialize();

// Use alongside existing code
app.get('/api/system-prefs/status', async (req, res) => {
    // Use new platform manager
    const result = await platform.handleAPIRequest('/system/settings/status', 'GET');
    res.json(result.data); // Legacy compatibility
});
```

## Benefits

### 1. **Platform Independence**
- Core logic works across different operating systems
- Easy to add Windows, Linux support in the future
- Consistent API regardless of underlying platform

### 2. **Standardized APIs**
- Consistent response formats across all endpoints
- Built-in error handling and validation
- Automatic data sanitization

### 3. **Better Configuration Management**
- Hierarchical settings with validation
- Easy backup and restore of configurations
- Platform-specific settings isolated from universal ones

### 4. **Improved Testing**
- Mock platform implementations for testing
- Isolated unit tests for core logic
- Platform-specific integration tests

### 5. **Future Extensibility**
- Easy to add new monitoring providers
- Plugin architecture for external integrations
- Standardized interfaces for external tools

## Configuration Structure

```json
{
  "version": "1.0.0",
  "platform": "darwin",
  "monitoring": {
    "enabled": true,
    "interval": 30000,
    "thresholds": {
      "cpu": { "warning": 70, "critical": 90 },
      "memory": { "warning": 70, "critical": 90 },
      "disk": { "warning": 80, "critical": 95 }
    },
    "applications": [
      { "name": "MyApp", "path": "/path/to/app", "shouldBeRunning": true }
    ]
  },
  "notifications": {
    "enabled": true,
    "channels": {
      "slack": { "enabled": false, "webhook": null },
      "discord": { "enabled": false, "webhook": null }
    }
  },
  "platformSettings": {
    // Platform-specific settings go here
  },
  "userPreferences": {
    "skipWizard": false,
    "defaultView": "dashboard",
    "showTooltips": true
  }
}
```

## API Endpoints

### Universal Endpoints
- `GET /system/info` - System information
- `GET /system/settings` - Available settings
- `GET /system/settings/status` - Current settings status
- `POST /system/settings/apply` - Apply settings
- `GET /monitoring/status` - Current monitoring data
- `GET /config` - Current configuration
- `PUT /config` - Update configuration

### Legacy Compatibility
- `GET /api/system-prefs/status` - Maps to `/system/settings/status`
- `POST /api/system-prefs/apply` - Maps to `/system/settings/apply`
- `GET /api/monitoring/system` - Maps to `/monitoring/status`

## Error Handling

Standardized error responses:
```json
{
  "success": false,
  "data": null,
  "message": "Operation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "field": "settings",
    "message": "Settings must be an array"
  },
  "timestamp": "2025-06-28T19:15:00.000Z"
}
```

## Future Enhancements

1. **Plugin System**: Allow external modules to register with the platform
2. **Remote Management**: Manage multiple installations from a central dashboard
3. **Cloud Integration**: Sync configurations and monitoring data to cloud services
4. **Advanced Analytics**: Historical data analysis and trend detection
5. **AI Integration**: Intelligent optimization recommendations

## Migration Path

### Phase 1: Infrastructure (Current)
- ✅ Create platform abstraction interfaces
- ✅ Implement macOS-specific managers
- ✅ Create unified platform manager
- ✅ Add configuration management

### Phase 2: Integration (Next)
- Update existing server to use platform manager
- Migrate existing modules to new architecture
- Update frontend to use standardized APIs
- Add comprehensive testing

### Phase 3: Extension (Future)
- Add Windows platform support
- Add Linux platform support
- Implement plugin architecture
- Add cloud integration features

## Getting Started

1. **Review the interfaces**: Understand the required methods for each platform
2. **Study the macOS implementation**: See how platform-specific code is structured
3. **Test the migration example**: Run the modernized server example
4. **Gradually migrate**: Move existing functionality piece by piece

This architecture maintains backward compatibility while providing a foundation for future cross-platform expansion.