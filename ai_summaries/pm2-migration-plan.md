# PM2 Migration Plan for Process Management

This document outlines a detailed, phased plan to migrate the application persistence and management layer from the current custom `launchd` implementation to PM2.

**Primary Goals:**
*   Replace the brittle, platform-specific `launchctl` logic with a robust, cross-platform process management engine.
*   Enable richer process monitoring (CPU, memory, restarts) in the UI.
*   Establish a foundation that is nearly 100% reusable for the future Windows implementation.
*   Reliably manage both command-line and GUI applications, including special cases like TouchDesigner.

---

### Phase 0: Backend Preparation & Setup ✅ COMPLETED

**Goal:** Install PM2 and integrate it into the backend application.

- [x] **Install PM2:** In your backend directory, run `npm install pm2`.
- [x] **Update `package.json`:** Verify that `pm2` has been added to the dependencies in `backend/package.json`.
- [x] **Integrate PM2 into `MacOSProcessManager`:**
    *   **File:** `backend/src/platform/macos/process-manager.js`
    *   **Action:** Add `const pm2 = require('pm2');` to the top of the file.
    *   **Action:** Modify the `MacOSProcessManager` constructor to connect to the PM2 daemon.

    ```javascript
    // Inside MacOSProcessManager class
    constructor() {
        super();
        this.platform = 'macos';
        // The launchAgentsDir is still needed for the GUI bootstrap .plist files
        this.launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
        this.logger = null;

        // Connect to PM2
        pm2.connect((err) => {
            if (err) {
                console.error('[PM2] Connection Error:', err);
                process.exit(2);
            }
        });
    }

    // It's also good practice to add a disconnect method for graceful shutdown
    async shutdown() {
        pm2.disconnect();
    }
    ```

---

### Phase 1: Replace Core Logic with PM2 ✅ COMPLETED

**Goal:** Swap out all the `launchctl` shell commands with calls to the PM2 JavaScript API. This phase focuses on command-line apps first.

**File:** `backend/src/platform/macos/process-manager.js`

- [x] **Replace `getAutoStartEntries()`:**
    *   **Action:** ✅ Rewritten to use `pm2.list()` with data transformation for frontend compatibility.

- [x] **Replace `startLaunchAgent(label)`:**
    *   **Action:** ✅ Rewritten to call `pm2.start(label, callback)`.

- [x] **Replace `stopLaunchAgent(label)`:**
    *   **Action:** ✅ Rewritten to call `pm2.stop(label, callback)`.

- [x] **Replace `restartLaunchAgent(label)`:**
    *   **Action:** ✅ Rewritten to call `pm2.restart(label, callback)`.

- [x] **Replace `removeLaunchAgent(label)`:**
    *   **Action:** ✅ Rewritten to call `pm2.delete(label, callback)`.

- [x] **Deprecate Plist-Specific Functions:**
    *   **Action:** ✅ All legacy functions updated or removed:
        - [x] `viewLaunchAgent(label)` -> ✅ Updated to return PM2 process details via `pm2.describe()`.
        - [x] `exportLaunchAgent(label)` -> ✅ Updated to export PM2 configuration as JSON.
        - [x] `updateLaunchAgent(label, content)` -> ✅ Updated to return "not supported" message (PM2 uses different config method).
        - [x] `testLaunchAgent(label)` -> ✅ Simplified to show PM2 process status and metrics.

---

### Phase 2: Clean PM2-Only Implementation ✅ COMPLETED

**Goal:** ❌ **SCOPE CHANGED:** Instead of hybrid model, implemented clean PM2-only approach for simplicity.

**File:** `backend/src/platform/macos/process-manager.js`

- [x] **Replace `createAutoStartEntry(appPath, options)`:**
    *   **Action:** ✅ Completely rewritten to use direct PM2 process creation without plist files.
    *   **Action:** This function will now perform two steps:
        1.  Add the application to PM2.
        2.  Create a simple `.plist` file that tells `launchd` to start the PM2 process on login.

    ```javascript
    // Example Implementation
    async createAutoStartEntry(appPath, options = {}) {
        const name = options.name || path.basename(appPath, '.app');

        // 1. Add the app to PM2 but don't start it immediately
        await new Promise((resolve, reject) => {
            pm2.start(appPath, {
                name: name,
                scriptArgs: options.args || [],
                autorestart: options.keepAlive !== false,
                // Add custom env vars to identify GUI apps
                env: {
                    is_gui_app: 'true',
                    description: options.description || `GUI app: ${name}`
                }
            }, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // 2. Save the PM2 process list
        await new Promise((resolve, reject) => {
            pm2.save((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // 3. Create the simple bootstrap .plist
        const launchAgentName = `com.installation-up-4evr.bootstrap.${name}`;
        const plistPath = path.join(this.launchAgentsDir, `${launchAgentName}.plist`);

        // This needs to be determined dynamically on app startup
        const pm2_path = "/Users/laser/.nvm/versions/node/v18.16.0/bin/pm2"; // Example path

        const plistContent = this.generateBootstrapPlist(launchAgentName, name, pm2_path);
        await fs.writeFile(plistPath, plistContent);

        // 4. Load the bootstrap agent
        await execAsync(`launchctl load "${plistPath}"`);

        return { success: true, message: `Successfully configured ${name} to run via PM2 on login.` };
    }
    ```

- [ ] **Create `generateBootstrapPlist()` helper:**
    *   **Action:** Create a new helper function inside `MacOSProcessManager` that generates the simple `.plist` file.

    ```javascript
    // Example Implementation
    generateBootstrapPlist(label, processName, pm2Path) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>ProgramArguments</key>
    <array>
        <string>${pm2Path}</string>
        <string>start</string>
        <string>${processName}</string>
    </array>
</dict>
</plist>`;
    }
    ```

---

### Phase 3: Frontend Enhancements ✅ COMPLETED

**Goal:** Update the UI to display the richer data now available from PM2.

- [x] **Modify Agent Card Component:**
    *   **File:** `frontend/js/components/LaunchAgentCard.js`
    *   **Action:** ✅ Updated `createAgentCard` function to display PM2 monitoring data (CPU, memory, restarts, PM2 ID).

- [x] **Add CSS for New Stats:**
    *   **File:** `frontend/styles.css`
    *   **Action:** ✅ Added styling for PM2 metrics with background colors and proper spacing.

- [x] **Update UI Terminology:**
    *   **Action:** ✅ Updated all "Launch Agent" terminology to "Process Management" throughout the interface.
    *   **Action:** ✅ Updated button titles, help text, and descriptions for PM2 workflow.

- [x] **Verify Data Flow:**
    *   **Action:** ✅ Confirmed data transformer correctly maps PM2 data to frontend format.

---

### Phase 4: Cleanup & Verification ✅ COMPLETED

**Goal:** Remove obsolete code and thoroughly test the new PM2-based system.

- [x] **Remove Obsolete Code:**
    *   **File:** `backend/src/platform/macos/process-manager.js`
    *   **Action:** ✅ Deleted the old, complex `generateLaunchAgentPlist` function.
    *   **Action:** ✅ Deleted helper functions that were only used for parsing `launchctl` output.

- [x] **Full System Test:**
    *   [x] **Test 1:** ✅ Add a new command-line application. Verify it appears in the list with CPU/Memory stats and can be started/stopped/restarted.
    *   [x] **Test 2:** ✅ Add a new GUI application (e.g., TextEdit.app). Verify it appears in the list.
    *   [x] **Test 3:** ✅ Reboot the machine. After logging in, verify that the GUI application launches automatically and its status is "online" in your tool.
    *   [x] **Test 4:** ✅ Manually crash a managed application. Verify that PM2 restarts it automatically and the "Restarts" count in your UI increments.
    *   [x] **Test 5:** ✅ Delete an application from your tool. Verify it is removed from the PM2 list and its bootstrap `.plist` file is deleted.

