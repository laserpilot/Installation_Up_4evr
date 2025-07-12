# Repository Cleanup and Refactoring Plan

This document outlines a plan to improve the overall quality, consistency, and maintainability of the repository. The goal is to remove dead code, enforce a consistent style, and refactor problematic areas.

---

## Phase 1: Code Formatting and Linting

This phase focuses on establishing a consistent code style across the entire project.

- [ ] **Introduce Prettier:**
  - [ ] Add `prettier` as a dev dependency: `npm install --save-dev prettier`.
  - [ ] Create a `.prettierrc` configuration file to define the code style (e.g., trailing commas, semi-colons, tab width).
  - [ ] Create a `.prettierignore` file to exclude directories like `node_modules` and `dist`.
- [ ] **Introduce ESLint:**
  - [ ] Add `eslint` and relevant plugins (e.g., `eslint-plugin-jest`) as dev dependencies.
  - [ ] Create a `.eslintrc.js` configuration file with a baseline ruleset (e.g., `eslint:recommended`).
- [ ] **Format Entire Codebase:**
  - [ ] Add a `format` script to `package.json`: `"format": "prettier --write ."`
  - [ ] Run the format script to apply a consistent style to all files.
- [ ] **Lint Entire Codebase:**
  - [ ] Add a `lint` script to `package.json`: `"lint": "eslint . --fix"`
  - [ ] Run the lint script to identify and fix code quality issues.

## Phase 2: Dead Code and File Removal

This phase focuses on identifying and deleting obsolete files and code that are no longer in use after various refactors.

- [ ] **Identify and Remove Deprecated Test Files:**
  - [ ] `test-cross-tab-integration.js`
  - [ ] `test-data-flow-validation.js`
  - [ ] `test-integration.js`
  - [ ] `test-module-interference.js`
  - [ ] `test-navigation.html`
  - [ ] `test-strategy1.js`
  - [ ] `test-user-experience.js`
  - [ ] `backend/test-*.js` files (e.g., `test-launch-agents.js`, `test-server.js`)
- [ ] **Identify and Remove Deprecated Debugging Scripts:**
  - [ ] `debug-app.js`
  - [ ] `debug-frontend.js`
- [ ] **Review and Remove Legacy Backend Code:**
  - [ ] Analyze the `backend/legacy/` directory. It likely contains old logic that has been replaced by the `backend/src/core/` implementation.
  - [ ] Confirm that files like `installation-settings.js`, `launch-agents.js`, etc., are no longer imported or used anywhere.
  - [ ] Delete the `backend/legacy/` directory once confirmed obsolete.
- [ ] **Review Frontend Modules:**
  - [ ] Check for any unused `.js` files in `frontend/js/modules` or `frontend/js/components` that are no longer imported in `main.js` or other active modules.

## Phase 3: Refactoring and Consistency

This phase focuses on improving the structure and consistency of the existing code.

- [ ] **Consolidate Notification Configuration:**
  - [ ] As identified previously, merge the functionality of `frontend/js/modules/notifications-config.js` into `notifications.js`.
  - [ ] Deprecate and delete `notifications-config.js`.
- [ ] **Standardize API Error Handling:**
  - [ ] Review all backend routes in `backend/routes/`.
  - [ ] Ensure all error responses follow a consistent JSON format (e.g., `{ success: false, error: 'Error message' }`).
  - [ ] Ensure all `catch` blocks in the frontend `apiCall` utility handle these errors gracefully.
- [ ] **Refactor Frontend Component Creation:**
  - [ ] Review how UI components are created (e.g., `LaunchAgentCard.js`).
  - [ ] Ensure all dynamically generated HTML follows a consistent pattern and uses template literals for readability.
  - [ ] Avoid using `innerHTML` where possible in favor of safer methods like `textContent` or creating elements with `document.createElement`.

## Phase 4: Dependency Management

This phase focuses on cleaning up the project's dependencies.

- [ ] **Audit NPM Dependencies:**
  - [ ] Run a tool like `depcheck` (`npx depcheck`) to identify unused dependencies in `package.json` and `backend/package.json`.
  - [ ] Carefully review and remove any reported unused packages.
- [ ] **Check for Outdated Dependencies:**
  - [ ] Run `npm outdated` in the root and `backend` directories.
  - [ ] Plan updates for any major, outdated packages, paying close attention to potential breaking changes.

## Phase 5: Documentation Cleanup

This phase focuses on ensuring all documentation is current and relevant.

- [ ] **Review Root-Level Markdown Files:**
  - [ ] Read through `README.md`, `AUTOMATION-TOOL-README.md`, etc. - do NOT edit README.md - instead only update `AUTOMATION-TOOL-README.md` with instructions for the actual script - README is meant to remain as-is
  - [ ] Update instructions, remove obsolete information, and ensure they reflect the current state of the project.
- [ ] **Review `ai_summaries` Directory:**
  - [ ] Check if any of the tracker documents are now fully resolved and can be archived.
  - [ ] Ensure the remaining trackers accurately describe the current state of their respective modules.
- [ ] **Remove Obsolete Comments:**
  - [ ] During the linting and refactoring process, remove any commented-out code blocks or comments that no longer provide value.
