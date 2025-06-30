# Gemini's Feature Suggestions for System Preferences

Based on a review of `README.md` and `backend/modules/system-prefs.js`, here are suggestions for improving the system preferences automation for robust, unattended installations.

## Analysis of Existing `system-prefs.js` Settings

The current settings provide a strong foundation.

#### **Essential / Must-Have Settings:**
The settings currently marked as `required: true` are perfect. Controlling sleep, screensaver, auto-restart, and software updates is non-negotiable for a stable installation.

#### **Less Necessary / Potentially Dangerous Settings:**

*   **`restartFreeze`**: This is good to have but has become unreliable in modern macOS. It is correctly marked as optional.
*   **`disableGatekeeper` / `allowAppsAnywhere`**: These are significant security risks. They should be moved to an "Expert" or "Danger Zone" section of the UI. The user should be clearly warned about the implications. The better long-term solution is to encourage developers to properly sign and notarize their applications.
*   **`disableSpotlight`**: A good optional performance tweak, but less critical on modern hardware unless the installation is extremely I/O-intensive.

---

## Suggested New System Preferences to Add

These suggestions are drawn from the excellent real-world advice in `README.md`.

### 1. Disable Notification Center / Set Do Not Disturb
*   **Why**: Notifications for software updates, new networks, etc., can appear over the installation application, ruining the experience. This is a high-priority addition.
*   **Implementation**: This is complex as it has changed with macOS versions (especially with the introduction of Focus Modes). It may require a combination of `defaults write` commands and AppleScript.
    *   A simple start would be scripting the toggling of "Do Not Disturb."
    *   A more robust solution would involve modifying the underlying plist files, such as `com.apple.ncprefs.plist`.

### 2. Hide Desktop Icons
*   **Why**: If the main application crashes, the desktop is exposed. Hiding the icons presents a cleaner, less-jarring failure state.
*   **Implementation**: This is a straightforward command.
*   **Command**: `defaults write com.apple.finder CreateDesktop -bool false; killall Finder`
*   **Revert**: `defaults write com.apple.finder CreateDesktop -bool true; killall Finder`

### 3. Disable "Application Unexpectedly Quit" Dialog
*   **Why**: This dialog is a showstopper for an unattended system. It prevents a launch agent from automatically restarting a crashed application until a user physically clicks "OK" or "Reopen".
*   **Implementation**: This requires disabling System Integrity Protection (SIP), which is a major security trade-off. This setting **must** be in an "Expert/Danger Zone" section with clear warnings that SIP must be disabled first.
*   **Command**: `sudo chmod 000 /System/Library/CoreServices/Problem\ Reporter.app`
*   **Revert**: `sudo chmod 755 /System/Library/CoreServices/Problem\ Reporter.app`

### 4. Disable Stage Manager (macOS Ventura and newer)
*   **Why**: As noted in the `README.md` changelog, Stage Manager can interfere with fullscreen applications and expected windowing behavior.
*   **Implementation**: This is likely a `defaults write` command targeting the `com.apple.dock` domain, but the specific key needs to be identified for recent macOS versions.

### 5. Network: Disable "Ask to join new networks"
*   **Why**: Prevents the Wi-Fi network selection pop-up from appearing if the primary connection is lost. This is crucial for systems that may be on unreliable networks.
*   **Implementation**: This can be managed using the `networksetup` command-line utility.

## Summary & Recommendations

1.  **Prioritize Adding**:
    *   Notification Management (Do Not Disturb).
    *   Hide Desktop Icons.
    *   Disable Crash Reporter (with strong warnings about SIP).
    *   Disable Stage Manager.

2.  **Re-categorize Dangerous Settings**:
    *   Move `disableGatekeeper` and any other settings that bypass core security features into a separate, clearly labeled "Advanced/Danger" section of the user interface. Explain the risks to the user.
