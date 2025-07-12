# Comprehensive Test Plan

This document outlines the plan to create a modern, comprehensive test suite for the application. The goal is to replace deprecated test scripts with a structured, maintainable suite that ensures stability and prevents regressions.

---

## 1. Setup and Configuration

- [x] Create the new top-level `tests/` directory.
- [x] Create the proposed subdirectory structure: `tests/unit`, `tests/integration`, `tests/e2e`, `tests/mocks`.
- [x] Install required `devDependencies`: `npm install --save-dev jest supertest playwright`.
- [x] Create and configure `jest.config.js` at the project root.
- [x] Add a new `test` script to `package.json`: `"test": "jest"`.

## 2. Unit Tests (`tests/unit/`)

These tests will focus on small, isolated pieces of business logic.

- [x] **Health Scoring:** Create `health-scoring.test.js`.
  - [x] Test the health scoring algorithm with mock data (high CPU, low memory).
  - [x] Assert that the correct health status (`good`, `warning`, `critical`) is returned.
- [x] **Validation Workflow:** Create `validation-workflow.test.js`.
  - [x] Test individual validation functions for inputs like webhook URLs.
  - [x] Assert that validators correctly identify valid and invalid data.

## 3. Integration Tests (`tests/integration/`)

These tests will verify the backend API endpoints.

- [x] **Mock Services:** Create a mock for the `pm2-service-manager` in `tests/mocks/` to prevent actual `pm2` calls during tests.
- [x] **Monitoring API:** Create `monitoring-api.test.js`.
  - [x] Test `GET /api/monitoring/status` and assert correct data structure.
  - [x] Test `GET` and `POST` for `/api/monitoring/config` and assert data is saved and retrieved.
- [x] **Applications API:** Create `applications-api.test.js`.
  - [x] Test `POST /api/applications/create-web` using the `pm2` mock.
  - [x] Test start, stop, and delete endpoints for applications.
  - [x] Assert that the API returns correct success and error responses.
- [x] **Notifications API:** Create `notifications-api.test.js`.
  - [x] Test `POST /api/notifications/config` to save a configuration.
  - [x] Test `GET /api/notifications/config` to verify the configuration was saved.
  - [x] Test `POST /api/notifications/test/slack` (and others) by mocking the outgoing webhook and asserting the correct payload is sent.

## 4. End-to-End (E2E) Tests (`tests/e2e/`)

These tests will simulate real user interaction in the Electron application.

- [ ] **Dashboard Loads:** Create `dashboard-loads.spec.js`.
  - [ ] Write a test that launches the Electron app.
  - [ ] Assert that the main window appears and displays initial data without console errors.
- [ ] **Monitoring Configuration Flow:** Create `monitoring-config-flow.spec.js`.
  - [ ] Write a test to navigate to the Monitoring Config tab.
  - [ ] Simulate changing a slider value and clicking "Save".
  - [ ] Reload the app and assert the new value is persisted.
- [ ] **Application Creation Flow:** Create `application-creation-flow.spec.js`.
  - [ ] Write a test to navigate to the Applications tab.
  - [ ] Simulate filling out the "Create Web App" form and submitting it.
  - [ ] Assert that the new application appears in the process list.
- [ ] **Monitoring to Notification Flow:** Create `alert-triggers-notification.spec.js`.
  - [ ] **Setup:**
    - [ ] In the test, configure a custom webhook notification channel that points to a mock server.
    - [ ] Set the "CPU Critical" threshold to a low value (e.g., 10%).
    - [ ] Enable the notification trigger for "Critical CPU".
  - [ ] **Action:**
    - [ ] Simulate high CPU usage in the backend (via a mock).
  - [ ] **Assertion:**
    - [ ] Assert that the mock server receives a webhook with the correct alert payload.

## 5. Deprecation

- [ ] Review all existing test scripts (e.g., `test-integration.js`, `test-user-experience.js`).
- [ ] Once the new Jest/Playwright suite is complete and passing, delete the old test files.
- [ ] Remove any old test-related scripts from `package.json`.
