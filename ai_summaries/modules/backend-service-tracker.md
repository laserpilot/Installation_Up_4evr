# Backend Service Module Tracker

**Module:** Backend Service Management  
**Files:** `frontend/js/modules/backend-service.js` (renamed from service-control.js), `frontend/index.html` (backend service section)  
**Last Updated:** 2025-07-06  
**Status:** 🔄 PM2 Integration Planned (v1.0.0-alpha.4)

**Note:** *This tracker covers backend service management functionality. Will be enhanced to work with PM2 process management system during the PM2 migration.*

---

## Current Status ⚠️

**⚠️ Status Unknown:**
- Backend Service tab functionality needs verification
- Integration with monitoring and launch agents unclear
- Server state accuracy issues reported
- May overlap with Applications functionality

---

## Active Issues 🎯

**PM2 Integration Opportunities (v1.0.0-alpha.4):**
- [ ] **PM2 Service Management**: Integrate backend service control with PM2
- [ ] **Process Monitoring**: Display backend service health via PM2 metrics
- [ ] **Service Status**: Use PM2 to accurately report server state
- [ ] **Restart Management**: Leverage PM2's restart capabilities for backend service
- [ ] **Clear Purpose**: Define distinct role from Process Management tab

**Legacy Issues (To be addressed with PM2):**
- [ ] Backend Service showing inaccurate server state 
- [ ] Unclear distinction between Backend Service and Applications functionality
- [ ] "Mode: Electron-managed" clarity needed

---

## Investigation Needed 🔍

### **Questions to Answer:**
1. **What services does this control?** - System services vs Applications?
2. **How does it differ from Applications?** - Scope and functionality overlap
3. **Server state accuracy** - What server is being monitored?
4. **Integration points** - How does it connect to monitoring system?

---

## Potential Use Cases

### **System Services (macOS)**
- Management of system-level services
- launchd system daemons control
- Background process monitoring
- System service health checking

### **Application Services**
- Web server management (if applicable)
- Database service control
- Custom application services
- Integration service management

---

## Development Notes

**Investigation Priority:**
- High priority due to reported accuracy issues
- Need to clarify relationship with Applications module
- Important for overall application architecture clarity

**For new issues or findings related to Backend Service functionality, add them to the main `active-issues.md` file with the `[Backend Service]` tag.**

---

## Reorganization Notes

**Phase 3 Rename (2025-07-06):**
- Successfully renamed "Service Control" tab to "Backend Service" for better clarity
- Module file renamed from `service-control.js` to `backend-service.js`
- "Backend Service" better represents the purpose of managing the application's backend services
- Investigation still needed to clarify functionality and resolve reported issues