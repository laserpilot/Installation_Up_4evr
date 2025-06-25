# Claude Context for Installation Up 4evr Automation Tool

## Project Overview
Building an automation tool to simplify Mac installation setup for creative technology installations. The tool will automate system preference changes, create launch agents, provide monitoring/logging dashboards, and health check scripts with a simple GUI interface.

## Architecture Decision
- **Platform**: Web app (local server + browser interface)
- **Backend**: Node.js with shell script integration
- **Frontend**: Modern web framework (React/Vue.js)
- **Structure**: Modular design for easy maintenance

## Current Status
- ✅ Analyzed existing README.md and shell scripts
- ✅ Designed modular tool architecture  
- ✅ Created system preferences automation module
- ✅ Built launch agent generator and manager
- ✅ Created web server and API endpoints
- ✅ Built complete frontend with drag-and-drop interface

## Key Requirements
- Automate all system preference changes from the README checklist
- Generate and manage launch agents 
- Monitoring dashboard with health checks
- Logging and notification system (Slack integration)
- Simple GUI interface
- Modular design for easy extension

## Important Notes
- All existing scripts are defensive/monitoring utilities (verified safe)
- Focus on 2025 updates mentioned in README (Apple Silicon, SIP, signing requirements)
- Must handle modern macOS security restrictions
- Target audience: creative technologists setting up installation computers

## Test Commands
- `cd backend && npm start` - Start web server
- `cd backend && npm test` - Run test suite  
- `cd backend && npm run test:system-prefs` - Test system preferences
- `cd backend && npm run test:launch-agents` - Test launch agents
- Open http://localhost:3001 in browser - Access web interface

## Next Steps
1. Complete system preferences automation module
2. Build launch agent generator and manager
3. Implement monitoring/health check dashboard
4. Add logging and notification system
5. Create simple GUI interface

## Key Files
- `README.md` - Main installation guide
- `ScriptExamples/` - Existing shell scripts for reference
- Backend modules will go in `backend/modules/`
- Frontend components will go in `frontend/components/`