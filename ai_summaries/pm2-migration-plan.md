# PM2 Migration Plan for Process Management

This document outlines a detailed, phased plan to migrate the application persistence and management layer from the current custom `launchd` implementation to PM2.

**Primary Goals:**
*   Replace the brittle, platform-specific `launchctl` logic with a robust, cross-platform process management engine.
*   Enable richer process monitoring (CPU, memory, restarts) in the UI.
*   Establish a foundation that is nearly 100% reusable for the future Windows implementation.
*   Reliably manage both command-line and GUI applications, including special cases like TouchDesigner.

---

### Phase 0: Backend Preparation & Setup

**Goal:** Install PM2 and integrate it into the backend application.

- [ ] **Install PM2:** In your backend directory, run `npm install pm2`.
- [ ] **Update `package.json`:** Verify that `pm2` has been added to the dependencies in `backend/package.json`.
- [ ] **Integrate PM2 into `MacOSProcessManager`:**
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

### Phase 1: Replace Core Logic with PM2

**Goal:** Swap out all the `launchctl` shell commands with calls to the PM2 JavaScript API. This phase focuses on command-line apps first.

**File:** `backend/src/platform/macos/process-manager.js`

- [ ] **Replace `getAutoStartEntries()`:**
    *   **Action:** Rewrite the function to use `pm2.list()`. This will replace all the file system reading and `launchctl list` parsing.
    *   **Note:** You will need to write a small "transformer" function to map the data from PM2's format to the format your frontend currently expects.

    ```javascript
    // Example Implementation
    async getAutoStartEntries() {
        return new Promise((resolve, reject) => {
            pm2.list((err, list) => {
                if (err) return reject(err);
                
                const transformedList = list.map(proc => ({
                    name: proc.name,
                    label: proc.name, // Use name for label for consistency
                    program: proc.pm2_env.pm_exec_path,
                    description: proc.pm2_env.description || null,
                    plistPath: 'Managed by PM2', // This is no longer a .plist
                    type: proc.pm2_env.is_gui_app ? 'GUI Application' : 'Background Process',
                    loaded: proc.pm2_env.status === 'online',
                    isRunning: proc.pm2_env.status === 'online',
                    pid: proc.pid,
                    cpu: proc.monit.cpu,
                    memory: proc.monit.memory,
                    restarts: proc.pm2_env.restart_time,
                    managedByTool: true
                }));
                resolve(transformedList);
            });
        });
    }
    ```

- [ ] **Replace `startLaunchAgent(label)`:**
    *   **Action:** Rewrite the function to call `pm2.start(label, (err, proc) => { ... });`.

- [ ] **Replace `stopLaunchAgent(label)`:**
    *   **Action:** Rewrite the function to call `pm2.stop(label, (err, proc) => { ... });`.

- [ ] **Replace `restartLaunchAgent(label)`:**
    *   **Action:** Rewrite the function to call `pm2.restart(label, (err, proc) => { ... });`.

- [ ] **Replace `removeLaunchAgent(label)`:**
    *   **Action:** Rewrite the function to call `pm2.delete(label, (err, proc) => { ... });`.
    *   **Action:** This should also delete the associated bootstrap `.plist` file if one exists (see Phase 2).

- [ ] **Deprecate Plist-Specific Functions:**
    *   **Action:** The following functions are now obsolete. They should be removed or modified to return meaningful data from PM2.
        - [ ] `viewLaunchAgent(label)` -> Can be changed to return the output of `pm2.describe(label)`.
        - [ ] `exportLaunchAgent(label)` -> No longer applicable. Can be removed.
        - [ ] `updateLaunchAgent(label, content)` -> No longer applicable. Can be removed.
        - [ ] `testLaunchAgent(label)` -> Can be simplified to check the status from `pm2.list()`.

---

### Phase 2: Implement the Hybrid Model for GUI Apps

**Goal:** Reliably launch GUI applications (like TouchDesigner) by using `launchd` as a simple "bootstrapper" for PM2.

**File:** `backend/src/platform/macos/process-manager.js`

- [ ] **Modify `createAutoStartEntry(appPath, options)`:**
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

### Phase 3: Frontend Enhancements

**Goal:** Update the UI to display the richer data now available from PM2.

- [ ] **Modify Agent Card Component:**
    *   **File:** `frontend/js/components/LaunchAgentCard.js`
    *   **Action:** Update the `createAgentCard` function to accept and display the new data fields (`cpu`, `memory`, `restarts`).

    ```javascript
    // In createAgentCard(agent, status) -> agent object now has more data
    // ... existing HTML ...
    <div class="agent-stats">
        <span>CPU: ${agent.cpu || 0}%</span>
        <span>MEM: ${agent.memory ? (agent.memory / 1024 / 1024).toFixed(1) : 0} MB</span>
        <span>Restarts: ${agent.restarts || 0}</span>
    </div>
    // ...
    ```

- [ ] **Add CSS for New Stats:**
    *   **File:** `frontend/styles.css`
    *   **Action:** Add styling for the new `.agent-stats` container to make it look good within the card.

- [ ] **Verify Data Flow:**
    *   **Action:** Ensure the `renderLaunchAgents` function in `frontend/js/modules/applications.js` correctly passes the new, richer `agent` object to `createAgentCard`. The data transformer you wrote in Phase 1 is key here.

---

### Phase 4: Cleanup & Verification

**Goal:** Remove obsolete code and thoroughly test the new PM2-based system.

- [ ] **Remove Obsolete Code:**
    *   **File:** `backend/src/platform/macos/process-manager.js`
    *   **Action:** Delete the old, complex `generateLaunchAgentPlist` function.
    *   **Action:** Delete any other helper functions that were only used for parsing `launchctl` output.

- [ ] **Full System Test:**
    *   [ ] **Test 1:** Add a new command-line application. Verify it appears in the list with CPU/Memory stats and can be started/stopped/restarted.
    *   [ ] **Test 2:** Add a new GUI application (e.g., TextEdit.app). Verify it appears in the list.
    *   [ ] **Test 3:** Reboot the machine. After logging in, verify that the GUI application launches automatically and its status is "online" in your tool.
    *   [ ] **Test 4:** Manually crash a managed application. Verify that PM2 restarts it automatically and the "Restarts" count in your UI increments.
    *   [ ] **Test 5:** Delete an application from your tool. Verify it is removed from the PM2 list and its bootstrap `.plist` file is deleted.

