# Installation Up 4evr - UI/UX Refactoring Instructions

## Project Context
This is a Mac automation tool that automates installation computer setup for creative technology projects (museums, galleries, interactive installations). The tool has evolved from a popular 12-year-old README guide into a comprehensive automation platform. It currently works but needs UI/UX restructuring to support the intended user journey and future platform expansion.

## Core Vision
Transform from a "flat" tool where all features are equally prominent into a **progressive enhancement system** that guides users through natural workflows while maintaining the same powerful backend capabilities.

## Target User Journey

### Phase 1: Initial Setup (Novice-Friendly)
- **Goal**: Get a computer configured for installation use quickly and confidently
- **User**: Technical artist, student, or installation technician
- **Priority**: Simple, guided experience that "just works"

### Phase 2: Deployment & Testing  
- **Goal**: Verify everything works, create launch agents, test scenarios
- **User**: Same person, now more confident with the tool
- **Priority**: Clear feedback, testing capabilities, profile management

### Phase 3: Operations & Monitoring
- **Goal**: Ongoing monitoring, remote control, maintenance
- **User**: Installation operator, client, or remote technician  
- **Priority**: Dashboard-focused, status-at-a-glance, remote capabilities

## Specific UI/UX Changes Needed

### 1. Restructure Navigation from Current Flat Model
**Current**: All tools equally prominent in sidebar
**New**: Progressive disclosure based on user journey

```
Suggested New Structure:
├── Setup Wizard (First-time guided experience)
├── Dashboard (Default landing - monitoring focus) 
├── Advanced Tools (System prefs, launch agents - tucked away)
└── Settings (Configuration, remote access)
```

### 2. Create Setup Wizard Flow
**Entry Point**: First-time users see a guided wizard, but advanced users can skip

**Wizard Controls:**
- **"Skip Setup"** button for advanced users who want direct access
- **"Run Setup Later"** option in main interface for those who skipped
- **"Modify Setup"** option to revisit/change wizard decisions after completion

Wizard Steps:
1. **Welcome & Detection** - Auto-detect system status, explain what will happen
2. **Essential Settings** - System preferences that are "must-have" (screensaver, sleep, auto-restart)
3. **Installation Type & App Configuration** - Choose installation approach:
   - **Desktop App** - Drag/drop .app file, create launch agent (current approach)
   - **Web-based Installation** - Configure Chrome/Chromium in kiosk mode + background services
   - **Custom Setup** - Advanced users can configure multiple components
4. **Background Services** - Configure supporting processes (PM2, custom scripts, etc.)
5. **Verification** - Test that everything works
6. **Monitoring Setup** - Create monitoring dashboard, optional remote access
7. **Complete** - "Your installation is ready!" with next steps

**Post-Setup Access**: All wizard functionality should remain available through "Setup Configuration" in Advanced Tools

### 3. Make Dashboard the Primary Interface
**After Setup**: Users should land on a monitoring-focused dashboard by default

Dashboard Should Include:
- System health at-a-glance (CPU, memory, disk, uptime)
- Application status (running/stopped, restart counts)
- Recent alerts/logs
- Quick action buttons (restart app, reboot system, take screenshot)
- "Advanced Tools" link for deeper configuration

### 4. Progressive Enhancement Architecture
**Beginner Mode** (Default):
- Setup wizard → Dashboard → Basic controls
- Advanced features hidden but accessible

**Advanced Mode** (Toggle or earned):
- Full access to system preferences automation
- Launch agent editing
- Custom monitoring configurations
- API access and remote control

**Setup Access Patterns:**
- **First-time users**: Wizard appears automatically with skip option
- **Advanced users who skipped**: "Run Initial Setup" prominently available in dashboard
- **Post-setup users**: "Setup Configuration" or "Modify Setup" in Advanced Tools section
- **Testing scenarios**: Easy access to re-run individual setup components without full wizard

### 5. Platform-Agnostic Abstractions

### Platform-Agnostic Abstractions

#### Separate Mac-Specific from Universal Concepts:

**Universal (Web-Ready) Components:**
- Monitoring dashboard and metrics
- Alert configuration and thresholds  
- Remote control commands (restart, screenshot, etc.)
- Logging and reporting interfaces
- Profile management (save/load configurations)
- Installation status and health checks
- **Process management** (apps, web servers, background services)
- **Browser/kiosk mode configuration**

**Mac-Specific Components:**
- System preferences automation (defaults, plist management)
- Launch agent creation and management
- macOS security handling (SIP, sudo prompts)
- File system operations requiring native access
- **Chrome/Chromium launch configuration** for macOS

#### Code Organization:
```
/src
├── /core (Platform-agnostic)
│   ├── /monitoring
│   ├── /dashboard  
│   ├── /alerts
│   ├── /profiles
│   ├── /process-management
│   ├── /browser-kiosk
│   └── /remote-control
├── /platform
│   ├── /macos (Current implementation)
│   ├── /windows (Future)
│   └── /linux (Future)
└── /ui
    ├── /wizard
    ├── /dashboard
    └── /advanced
```

## Implementation Priorities

### Phase 1: UI/UX Restructuring (Current Sprint - FOCUS HERE)
**Priority: Make the existing tool more approachable and organized**
1. **Create wizard component** that guides through current system-prefs → launch-agents → monitoring setup
2. **Restructure main app** to default to dashboard view instead of system preferences
3. **Hide advanced tools** behind "Advanced" or "Configuration" section
4. **Improve first-run experience** with better onboarding
5. **Add skip/return-to-setup options** for advanced users

**Success Criteria**: A novice user can successfully set up an installation without feeling overwhelmed, while advanced users retain full access to existing functionality.

### Phase 2: Code Organization (Next Sprint)
**Priority: Clean architecture for future expansion**
1. **Separate platform-specific from universal code** (prepare for cross-platform)
2. **Standardize internal APIs** between frontend and backend
3. **Document integration patterns** for future external tool connections
4. **Improve error handling and user feedback**

**Success Criteria**: Codebase is organized for maintainability and future platform support.

### Future Phases (Document but Don't Implement Yet)
- **External monitoring integration** (Prometheus, Grafana)
- **AI agent API design** 
- **Creative coding framework templates** (TouchDesigner, Unity, etc.)
- **Multi-platform support** (Windows, Linux)
- **Advanced analytics and engagement tracking**

## Specific Technical Requirements

### Setup Wizard Implementation
- **Modal or dedicated route** that takes over on first run
- **Progress indicator** showing steps completed
- **Skip/advanced options** for experienced users
- **Auto-detection** of current system state
- **Clear success/failure feedback** at each step

### Dashboard Redesign
- **Card-based layout** for different monitoring areas
- **Real-time updates** via websockets or polling
- **Mobile-responsive** design for remote checking
- **Export capabilities** for sharing status with clients

### Advanced Tools Reorganization  
- **Collapsible sections** or separate "Advanced" page
- **Contextual help** explaining when/why to use each tool
- **Undo/reset capabilities** for system changes
- **Verification modes** to test settings before applying

### Platform Abstraction Patterns
- **Plugin interfaces** for platform-specific operations
- **Unified data models** for monitoring and configuration
- **API specifications** that work across platforms
- **Configuration schemas** that can be shared between platforms

## Success Metrics

### User Experience:
- **Time to first success**: How quickly can a novice get a working installation?
- **Confidence level**: Do users feel they understand what happened?
- **Return usage**: Do users find the ongoing monitoring valuable?

### Technical:
- **Code reusability**: How much can be shared with future Windows/Linux versions?
- **Maintainability**: Is the platform-specific vs universal separation clean?
- **Extensibility**: Can new features be added without breaking the progressive enhancement model?

## Notes for Implementation

- **Keep existing backend APIs** - this is primarily a frontend/UX restructuring
- **Maintain backward compatibility** - existing users should be able to access advanced features
- **Document the abstractions** - create clear interfaces for future platform implementations
- **Test with both novice and expert users** - ensure the progressive enhancement actually works
- **Consider mobile/remote access** early in dashboard design

## Future Considerations (Document Architecture, Don't Implement)

### External Tool Integration Readiness
- **Metrics export capabilities** - design data collection with future Prometheus/Grafana integration in mind
- **API standardization** - structure internal APIs so they can eventually support external tools
- **Configuration schemas** - use consistent data models that could work with AI agents or other automation tools

### Platform Expansion Preparation  
- **Windows/Linux platform modules** following the same patterns established here
- **Creative coding framework templates** (TouchDesigner, Unity, etc.) as installation starting points
- **Community profile sharing** (installation templates)

### Advanced Features (Later)
- **Multi-computer management** (fleet monitoring)
- **Cloud monitoring service** integration
- **Engagement analytics** for client reporting
- **AI agent integration** for natural language configuration

**Important**: These are architectural considerations to keep in mind during Phase 1 & 2 refactoring, but should NOT be implemented now. Focus on making the current Mac tool excellent first.

---

**Goal**: Transform the existing working tool into an approachable, well-organized interface that guides users through the natural workflow while maintaining all current functionality. Establish clean architectural patterns that will support future expansion, but resist the temptation to build advanced features until the core user experience is perfected.

**Key Principle**: Make the current Mac tool excellent and adoption-ready before expanding scope.