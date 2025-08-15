#!/bin/bash

#####################################################################
# Installation Up 4evr - macOS System Setup Script
# 
# This script applies all the essential macOS settings for creative
# technology installations without requiring the full automation tool.
#
# Usage: ./installation-setup-mac.sh
#
# What this script does:
# - Disables screensaver
# - Prevents display and computer sleep
# - Sets desktop to black background
# - Disables automatic software updates
# - Configures auto-restart on power failure
# - Disables Bluetooth setup assistant
# - Hides menu bar automatically
# - Disables App Nap globally
# - Creates a verification report
#
# IMPORTANT: This script requires administrator privileges for some
# settings. You will be prompted for your password.
#####################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command succeeded
check_result() {
    if [ $? -eq 0 ]; then
        print_success "$1"
    else
        print_error "Failed: $1"
    fi
}

print_status "Starting Installation Up 4evr macOS Setup..."
echo "This script will configure your Mac for 24/7 installation use."
echo ""

# Check for admin privileges
print_status "Checking administrator privileges..."
if sudo -n true 2>/dev/null; then
    print_success "Administrator privileges confirmed"
else
    print_warning "Some settings require administrator privileges"
    echo "You may be prompted for your password for system-level changes"
fi

echo ""
print_status "=== APPLYING SYSTEM SETTINGS ==="
echo ""

# 1. Disable Screensaver
print_status "Disabling screensaver..."
defaults -currentHost write com.apple.screensaver idleTime 0
check_result "Screensaver disabled"

# 2. Disable Display Sleep
print_status "Disabling display sleep..."
sudo pmset -a displaysleep 0
check_result "Display sleep disabled"

# 3. Disable Computer Sleep  
print_status "Disabling computer sleep..."
sudo pmset -a sleep 0
check_result "Computer sleep disabled"

# 4. Enable Auto Restart on Power Failure
print_status "Enabling auto restart on power failure..."
sudo pmset -a autorestart 1
check_result "Auto restart enabled"

# 5. Enable Restart on System Freeze
print_status "Enabling restart on system freeze..."
sudo systemsetup -setrestartfreeze on >/dev/null 2>&1
check_result "Restart on freeze enabled"

# 6. Set Desktop Background to Black
print_status "Setting desktop background to black..."
osascript -e 'tell application "Finder" to set desktop picture to POSIX file "/System/Library/Desktop Pictures/Solid Colors/Black.png"' >/dev/null 2>&1
if [ $? -ne 0 ]; then
    # Fallback for different macOS versions
    osascript -e 'tell application "Finder" to set desktop picture to POSIX file "/Library/Desktop Pictures/Solid Colors/Black.png"' >/dev/null 2>&1
fi
check_result "Desktop background set to black"

# 7. Disable Automatic Software Updates
print_status "Disabling automatic software updates..."
sudo softwareupdate --schedule off >/dev/null 2>&1
check_result "Automatic software updates disabled"

# 8. Disable Automatic Update Check
print_status "Disabling automatic update checking..."
defaults write com.apple.SoftwareUpdate AutomaticCheckEnabled -bool false
check_result "Automatic update checking disabled"

# 9. Disable Automatic App Store Updates
print_status "Disabling automatic App Store updates..."
defaults write com.apple.commerce AutoUpdate -bool false
check_result "Automatic App Store updates disabled"

# 10. Disable Bluetooth Setup Assistant
print_status "Disabling Bluetooth setup assistant..."
defaults write /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekKeyboard -bool false
defaults write /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekPointingDevice -bool false
check_result "Bluetooth setup assistant disabled"

# 11. Auto-hide Menu Bar
print_status "Setting menu bar to auto-hide..."
defaults write NSGlobalDomain _HIHideMenuBar -bool true
check_result "Menu bar set to auto-hide"

# 12. Disable App Nap Globally
print_status "Disabling App Nap globally..."
defaults write NSGlobalDomain NSAppSleepDisabled -bool YES
check_result "App Nap disabled globally"

# 13. Hide Desktop Icons (optional - commented out by default)
# print_status "Hiding desktop icons..."
# defaults write com.apple.finder CreateDesktop -bool false
# check_result "Desktop icons hidden"

# 14. Disable Notification Center "Do Not Disturb" setup (without disabling SIP)
print_status "Configuring notification settings..."
defaults write com.apple.ncprefs dnd_prefs -dict-add dndDisplayLock -bool true
defaults write com.apple.ncprefs dnd_prefs -dict-add dndDisplaySleep -bool true
check_result "Notification settings configured"

# 15. Show hidden files in Finder (useful for troubleshooting)
print_status "Enabling hidden files in Finder..."
defaults write com.apple.finder AppleShowAllFiles -bool true
check_result "Hidden files enabled in Finder"

echo ""
print_status "=== VERIFICATION ==="
echo ""

# Verification Section
print_status "Verifying applied settings..."

# Check screensaver
SCREENSAVER=$(defaults -currentHost read com.apple.screensaver idleTime 2>/dev/null)
if [ "$SCREENSAVER" = "0" ]; then
    print_success "✓ Screensaver: Disabled"
else
    print_warning "✗ Screensaver: Not properly disabled"
fi

# Check power management
DISPLAY_SLEEP=$(pmset -g | grep displaysleep | awk '{print $2}')
SYSTEM_SLEEP=$(pmset -g | grep sleep | grep -v displaysleep | awk '{print $2}')
if [ "$DISPLAY_SLEEP" = "0" ]; then
    print_success "✓ Display sleep: Disabled"
else
    print_warning "✗ Display sleep: Still enabled ($DISPLAY_SLEEP minutes)"
fi

if [ "$SYSTEM_SLEEP" = "0" ]; then
    print_success "✓ System sleep: Disabled"
else
    print_warning "✗ System sleep: Still enabled ($SYSTEM_SLEEP minutes)"
fi

# Check auto restart
AUTO_RESTART=$(pmset -g | grep autorestart | awk '{print $2}')
if [ "$AUTO_RESTART" = "1" ]; then
    print_success "✓ Auto restart: Enabled"
else
    print_warning "✗ Auto restart: Not enabled"
fi

# Check software updates
UPDATE_SCHEDULE=$(softwareupdate --schedule 2>/dev/null)
if echo "$UPDATE_SCHEDULE" | grep -q "off"; then
    print_success "✓ Software updates: Disabled"
else
    print_warning "✗ Software updates: May still be enabled"
fi

echo ""
print_status "=== COMPLETION ==="
echo ""

print_success "Installation Up 4evr setup complete!"
echo ""
echo "NEXT STEPS:"
echo "1. Restart your Mac to ensure all settings take effect"
echo "2. Set up automatic login:"
echo "   - Go to System Preferences > Users & Groups > Login Options"
echo "   - Set 'Automatic login' to your user account"
echo "   - IMPORTANT: Use a standard (non-admin) user for security"
echo ""
echo "3. Configure your applications to start automatically:"
echo "   - Use System Preferences > Users & Groups > Login Items"
echo "   - OR create Launch Agents for more reliable startup"
echo ""
echo "4. Test your setup:"
echo "   - Restart and verify applications start automatically"
echo "   - Test power failure recovery if possible"
echo "   - Verify displays stay on during long periods"
echo ""
echo "For advanced features like Launch Agents, monitoring, and remote"
echo "control, consider using the full Installation Up 4evr automation tool."
echo ""
print_status "Setup log saved to: ~/Desktop/installation-setup-$(date +%Y%m%d-%H%M%S).log"

# Save verification results to desktop
LOG_FILE="$HOME/Desktop/installation-setup-$(date +%Y%m%d-%H%M%S).log"
{
    echo "Installation Up 4evr Setup Results - $(date)"
    echo "======================================"
    echo ""
    echo "Applied Settings:"
    echo "- Screensaver: Disabled"
    echo "- Display Sleep: Disabled" 
    echo "- Computer Sleep: Disabled"
    echo "- Auto Restart: Enabled"
    echo "- Desktop Background: Black"
    echo "- Software Updates: Disabled"
    echo "- Bluetooth Setup: Disabled"
    echo "- Menu Bar: Auto-hide"
    echo "- App Nap: Disabled"
    echo ""
    echo "Current System Status:"
    echo "- Screensaver idle time: $SCREENSAVER"
    echo "- Display sleep: $DISPLAY_SLEEP"
    echo "- System sleep: $SYSTEM_SLEEP" 
    echo "- Auto restart: $AUTO_RESTART"
    echo ""
    echo "Manual steps still needed:"
    echo "1. Configure automatic login (System Preferences)"
    echo "2. Set up application auto-start (Login Items or Launch Agents)"
    echo "3. Test complete setup with restart"
} > "$LOG_FILE"

print_success "Setup complete! Please restart your Mac to ensure all changes take effect."