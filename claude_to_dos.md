Current issue and to-do list. Please pay attention to the nesting of to-do list items because it they are contextually relevant to which tab they occur on. also please check off to-do's when they are completed.

- [x] Top bar always shows "SIP Unknown" ✅ FIXED - Added SIP status API routes to platform manager
- [ ] On system configuration tab - the following issues:
    - [x] then selecting "Verify Current Settings", the modal pops up in a weird way at the bottom of the screen and seems to layer itself if you click Verify a few times. This should pop up similarly to what happens when you click "Generate Terminal commands" ✅ FIXED - Modal now uses proper overlay structure and prevents layering
    - [x] Auto Restart system setting seems incorrect or outdated, it may need to be revised to be `sudo systemsetup -setrestartfreeze on` and moved to an optional step ✅ FIXED - Updated autoRestart to use systemsetup -setrestartfreeze and made it optional, added separate powerFailureRestart setting
    - [ ] Related to sleep and restart - we may want to consider these adding or modifying these pmset settings as well sudo pmset -a sleep 0 displaysleep 0 disksleep 0 standby 0 hibernatemode 0 powernap 0 
    - [x] Enable Do not disturb is actually not quite right. What really needs to happen is to enable do not disturb and set a start and end time for it - if it is just set once, it will reset later. I think what works is to set it to start at midnight and end at midnight. ✅ ADDED - Do Not Disturb setting with midnight-to-midnight schedule
    - [x] Hide Menu bar seems ok, but i think we might also need "Automatically show and hide Dock" to be an option that is enabled - Dock should automatically hide ✅ ADDED - Auto-hide Dock setting
    - [x] Hide desktop icons is not a query-able state so it shows an error for that one - not sure how to work around that ✅ ADDED - Hide Desktop Icons setting with proper verification
    - [x] Needs an optional setting to disable Bluetooth Setup Assistant from popping up with `sudo defaults write /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekPointingDevice -bool false
sudo defaults write /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekKeyboard -bool false` ✅ ADDED - Disable Bluetooth Setup Assistant setting
    - [x] i feel like we should give the user an option to generate or show a terminal command that will effectively return all the values of these various things to their default states again in case they are done with the thing being an installation ✅ FIXED - Added "Generate Restore Script" button in System Configuration tab that creates a comprehensive script to revert all 17 settings to macOS defaults
    - [x] Setup Wizard should be kept in parity of preferences to be enabled if anything in the main "advanced" system preferences changes ✅ FIXED - Enhanced Setup Wizard Step 3 to include all 17 settings (3 required + 14 optional) with automatic sync when settings change in advanced tab
- [x] Launch Agents tab seems to not be working or it no longer shows existing launch agents. API endpoint was added, but the UI doesn't show anything ✅ FIXED - Enhanced getAutoStartEntries to show all launch agents (user, system, and running services) with proper plist parsing
- [x] System Monitoring tab issues ✅ FIXED - Added displays data to sanitizeMonitoringData 
    - [x] Display Status shows "Display Monitoring not available" on frontend ✅ FIXED - Updated display monitoring to extract proper resolution data and fixed frontend data structure handling
    - [x] Network Status shows only "Network Status unavailable" ✅ FIXED - Fixed frontend data path to properly extract network data from API response
- [x] In the Installation Dashboard tab, there are a few issues ✅ FIXED - All dashboard issues resolved
    - [x] WHen first loading the app, you see "Dashboard Refreshed Successfully" show up as a Toast notification 3 times ✅ FIXED - Modified refreshDashboard to only show toast on manual refresh, removed redundant MutationObserver
    - [x] Memory usage seems to always be at 99% even though thats not really how modern memory management works with swap memory and things like that. i wonder if we need to show like the top 3 memory using processes or a percentage like that anytime we show the memory usage - right now its not very useful for the user ✅ FIXED - Improved memory calculation (active+wired vs total) and added top 3 memory processes display
    - [x] CPU usage should show the top 3 CPU processes ✅ FIXED - Added getTopCPUProcesses method and enhanced CPU monitoring to show top CPU-using processes with percentages
    - [x] Disk usage also seems to be incorrect - it always shows 1% but i think if we're actually looking at disk storage amount, we probably need another metric. We need enhanced disk monitoring with comprehensive volume info, storage breakdown, and GB display shown on the UI ✅ FIXED - Updated disk usage calculation to use Data volume instead of root volume, now shows proper 60% usage with GB values and volume details
- [x] Backend Service Control tab no longer shows the status of the backend and needs to be updated. Service logs are also not working ✅ FIXED - Added comprehensive service control API routes with status, logs, start/stop/restart functionality
- [x] Installation Settings Tab gives a 404 error notification and that the settings cannot be found ✅ FIXED - Added comprehensive installation settings API with defaults, save, test, and reset functionality
- [ ] Future features:
    - [ ] Add a configuration to Monitoring configuration that lets you add a list of IP addresses to be pinged on a specific interval and log those to a file. this will be useful to log if the machine regularly loses connection to other devices or the internet


