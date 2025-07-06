# Sidebar Refactoring Checklist

This checklist provides a step-by-step guide for the planned sidebar reorganization. Mark each item as completed to track your progress through the refactor.

**Status:** Phase 0 Complete ✅ | Phases 1-4 Ready for Implementation

---

## Phase 0: Documentation Preparation ✅ COMPLETE

**Goal:** Update all documentation to match the new structure before making UI changes

#### **Step 0.1: Consolidate Module Trackers** ✅
- [x] **Merge monitoring trackers:** Combined `monitoring-config-tracker.md` + `monitoring-tracker.md` → `monitoring-tracker.md`
- [x] **Merge system trackers:** Updated `system-preferences-tracker.md` → `system-tracker.md` (includes installation settings)
- [x] **Rename applications:** `launch-agents-tracker.md` → `applications-tracker.md`
- [x] **Rename backend service:** `service-control-tracker.md` → `backend-service-tracker.md`
- [x] **Rename global settings:** `configuration-tracker.md` → `global-settings-tracker.md`
- [x] **Delete obsolete files:** Removed `monitoring-config-tracker.md`

#### **Step 0.2: Update Cross-References** ✅
- [x] **Update active-issues.md:** All module name references updated to new structure
- [x] **Update project-status.md:** Module status table and references updated
- [x] **Add reorganization notes:** Documentation includes reorganization context

---

### Phase 1: Consolidate Monitoring ✅ COMPLETE

**Goal:** Merge `System Monitoring` and `Monitoring Configuration` into a single `Monitoring` tab.

#### **Step 1.1: `frontend/index.html`** ✅
- [x] **Move Content:** Cut the entire `<div id="monitoring-config-tab" ...></div>` block.
- [x] **Paste Content:** Paste the cut block inside the `<div id="monitoring-tab" ...></div>`, placing it after the first `<section class="card">`.
- [x] **Update Sidebar:** Delete the `<button ... data-tab="monitoring-config">` from the sidebar navigation.

#### **Step 1.2: `frontend/js/main.js`** ✅
- [x] **Remove Import:** Delete the line: `import { initMonitoringConfig } from './modules/monitoring-config.js';`.
- [x] **Remove Initializer:** In the `moduleInitializers` object, delete the `'monitoring-config': initMonitoringConfig` line.

#### **Step 1.3: JavaScript Logic** ✅
- [x] **Import Config Logic:** Re-import `initMonitoringConfig` from `monitoring-config.js`.
- [x] **Integrate Initializer:** In `initMonitoringTab()` function, call `initMonitoringConfig()` to initialize configuration functionality.
- [x] **Update Settings Button:** Change monitoring settings button to scroll to config section instead of navigating to separate tab.
- [x] **Keep Config File:** Maintain `monitoring-config.js` file as separate module for maintainability.

---

### Phase 2: Consolidate System Settings

**Goal:** Merge `System Preferences` and `Installation Settings` into a single `System` tab.

#### **Step 2.1: `frontend/index.html`**
- [ ] **Move Content:** Cut the entire `<div id="installation-settings-tab" ...></div>` block.
- [ ] **Paste Content:** Paste the cut block inside the `<div id="system-prefs-tab" ...></div>`, after the existing `<section class="card">`.
- [ ] **Update Sidebar:** Delete the `<button ... data-tab="installation-settings">`.
- [ ] **Rename Sidebar Button:** Change the `system-prefs` button text from "System Configuration" to "System" and its `data-tab` to `system`.
- [ ] **Rename Tab Pane:** Rename the tab pane ID from `system-prefs-tab` to `system-tab`.

#### **Step 2.2: `frontend/js/main.js`**
- [ ] **Remove Import:** Delete the line for `installation-settings.js`.
- [ ] **Update Import:** Change the import from `./modules/system-preferences.js` to `./modules/system.js`.
- [ ] **Update Initializer:** In `moduleInitializers`, remove the `'installation-settings'` entry and rename `'system-prefs'` to `'system'`.
- [ ] **Update Initializer Function:** Ensure the function for the `'system'` key is `initSystem`.

#### **Step 2.3: JavaScript Logic**
- [ ] **Copy Logic:** Copy the contents of `frontend/js/modules/installation-settings.js`.
- [ ] **Paste Logic:** Paste the code into the end of `frontend/js/modules/system-preferences.js`.
- [ ] **Integrate Initializer:** Move the code from `initInstallationSettings()` into `initSystemPreferences()`.
- [ ] **Rename Initializer:** Rename the `initSystemPreferences()` function to `initSystem()`.
- [ ] **Delete File:** Delete `frontend/js/modules/installation-settings.js`.
- [ ] **Rename File:** Rename `frontend/js/modules/system-preferences.js` to `frontend/js/modules/system.js`.

---

### Phase 3: Rename & Clarify Tabs

**Goal:** Rename the remaining tabs for clarity and future-proofing.

#### **Step 3.1: "Launch Agents" -> "Applications"**
- [ ] **HTML:** In `index.html`, update the `data-tab` to `applications`, the button text to "Applications", and the tab pane ID to `applications-tab`.
- [ ] **JS `main.js`:** Update the import to `./modules/applications.js` and the initializer key to `'applications'`.
- [ ] **JS File:** Rename `frontend/js/modules/launch-agents.js` to `applications.js`.
- [ ] **JS Functions:** Inside `applications.js`, rename functions like `initLaunchAgents` to `initApplications`.

#### **Step 3.2: "Service Control" -> "Backend Service"**
- [ ] **HTML:** In `index.html`, update the `data-tab` to `backend-service`, the button text to "Backend Service", and the tab pane ID to `backend-service-tab`.
- [ ] **JS `main.js`:** Update the import to `./modules/backend-service.js` and the initializer key to `'backend-service'`.
- [ ] **JS File:** Rename `frontend/js/modules/service-control.js` to `backend-service.js`.
- [ ] **JS Functions:** Inside `backend-service.js`, rename functions like `initServiceControl` to `initBackendService`.

#### **Step 3.3: "Configuration" -> "Global"**
- [ ] **HTML:** In `index.html`, update the `data-tab` to `global`, the button text to "Global", and the tab pane ID to `global-tab`.
- [ ] **JS `main.js`:** Update the import to `./modules/global-settings.js` and the initializer key to `'global'`.
- [ ] **JS File:** Rename `frontend/js/modules/configuration.js` to `global-settings.js`.
- [ ] **JS Functions:** Inside `global-settings.js`, rename functions like `initConfiguration` to `initGlobalSettings`.

---

### Phase 4: Final HTML Cleanup

**Goal:** Reorganize the sidebar into the final "CORE" and "SETTINGS" groups.

#### **Step 4.1: `frontend/index.html`**
- [ ] **Reorder Buttons:** In the sidebar, cut and paste the `<button>` elements to match the new `CORE` and `SETTINGS` groups.
- [ ] **Update Section Titles:** Replace the old `<h4 class="sidebar-section-title">` elements with the new titles: `CORE` and `SETTINGS`.

#### **Step 4.2: Verification**
- [ ] **Test All Tabs:** Click through every tab in the new sidebar and verify that the correct content loads and all interactive elements (buttons, forms, etc.) are fully functional.