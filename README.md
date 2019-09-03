---------

Posted to Git for other people's modifications - please contribute if you'd like!

[Windows Version from Branger Briz](https://github.com/brangerbriz/up-4evr-windows-10)

[Ubuntu Linux Version from Branger Briz](https://github.com/brangerbriz/up-4evr-ubuntu)

Todo: 

 - fix table of contents linking 

 
Changelog:

 - August 2019 - modified article to remove old tips that are less helpful. Added a quick checklist

---------

## Table of Contents



1. [TL;DR Quick Checklist](#TL;DR-Quick-Checklist)
2. [Step 1: Prepare your software](#prepare-your-software)
2. [Step 2: Prepare the computer](#prepare-the-computer)
    1. [Screensaver](#screensaver)
    2. [Desktop](#desktop)
    1. [Energy Saver](#energy-saver)
    1. [Security](#security)
    1. [Users and Groups](#users-and-groups)
    1. [Software Update](#software-update)
    1. [Sharing](#sharing)
    1. [Network](#network)
    1. [Bluetooth](#bluetooth)
    1. [Notification Center](#notification-center-and-popups)
    2. [System Integrity Protection](#system-integrity-protection)
    3. [Other Notes](#other-notes)
1. [Step 3: Boot into your software](#boot-into-your-software)
1. [Step 4: Keep it running forever](#keep-it-running-forever)
    1. [Launchd](#launchd)
    1. [Lingon](#lingon)
    1. [LaunchControl](#launchcontrol)
    1. [Shell Script+Cron Job Method](#shell-script)
    1. [Non-Cronjob - Shell Script Method](#non)
1. [Step 5: Reboot periodically](#reboot-periodically)
1. [Step 6: Check in on it from afar](#check-in-on-it-from-afar)
1. [Step 7: Test, test, test](#test-test-test)
1. [Additional Tips: Logging](#additional-tips)
1. [Memory lead murderer](#memory-leak-murderer)
1. [Alternate Resources](#alternate-resources)
    1. [MAC OS X](#mac-os-x)
    1. [Linux](#linux)
    1. [Raspberry Pi](#raspberry-pi)
    1. [Windows](#windows)


## TL;DR Quick Checklist

- System Preferences:
	- **Recommended:**
		- [ ] Set Screensaver to Never (Screensaver)
		- [ ] Disable Automatic Software Updates (Software Update)
		- [ ] Set Computer and Display Sleep to Never (Energy Saver)
		- [ ] Set Desktop background to solid black (Desktop)
		- [ ] Uncheck "Disable Automatic Login" (Security)
		- [ ] Enable Automatic Login for a specific user (Users & Groups)
	- **Optional:**
		- [ ] Enable Screensharing and Filesharing (Sharing)
		- [ ] Disable Bluetooth Setup Assistant(Bluetooth)
		- [ ] Disable Notification Center/Set Do Not Disturb to be 24hrs (Notification Center)
	
- Booting into your software
	- [ ] Use Login Items in _Users and Groups_ or use a Launch Agent
- Keeping the software running at all times\
	- [ ] Use a Launch Agent to start your app and have the OS keep it running
- Rebooting automatically
	- [ ] Use the "Schedule" button in _Energy Saver_ to schedule regular reboots
- Remote access and logging
	- [ ] Set up something to log in to the computer remotely (Logmein, Teamviewer, etc)
	- [ ] Log various details about the computer and app
- Testing
	- [ ] Do several test boots and scenarios and monitor for the first week to make sure everything is functioning predictably
- Other things
	- [ ] Backup the drive you prepared and save it somewhere

## 2019 preface: 
This article was put together in 2012 as a personal guide for how to set up installation computers for professional creative technology installations, particularly for Mac computers. I needed something that put various tips in one space so that I could refer back to it when a new project came along. 

There was nothing like it at the time, and it seems like it has become a cult reference guide for best practices for professionals and artists working with creative technology installations. The original version was very wordy, confusing at points, and had some tips that end up being more distracting than useful, so I have gone through and stripped out sections and try to get to the point a bit more quickly. There are also some tips that I've found I use every time, and some that are seldom or never used these days - I have deleted some and relegated the rest to the appendix.

## Intro:

When developing your project, at every stage, always think about the final installation and what things you'll need to do to keep it running forever. Getting a frantic call on a vacation day or weekend is never pleasant. I do not recommend relying on caretakers to know how to address bugs or get something running again. You will need to ensure the process to fix issues is extremely simple, especially if you're installing at a retail store or event that may not have technically savvy people there to help diagnose an issue.

This is a guide with tips on how to keep your MacOS-based installation running forever.

_As a security disclaimer. Many of these tips, like enabling automatic login, do weaken the intended security of Mac OS. Make sure to take extra precautions that your computer is not physically accessible by the public and that it is not easily accessed over the network by malicious actors._

## Prepare your software
-------------------------------

While developing, I've found it really useful to consider which things will need to be adjusted and accessed by you or a caretaker throughout your project's lifespan. 

Debug menus, hidden sliders, key commands and external config files are great when you can't compile the app anymore or just need to make a quick change. The time you spend now to make things simple and easy to change will save you hours of remote debugging when something breaks. Also related, the more breadcrumbs, error reporting, and log files you can build in, the faster you'll be able to get the bottom of what's causing crashes with a new installation.


## Prepare the Computer
-----------------------------------------------

This section covers the various MacOS settings you'll need to check and enable to keep them from interfering with your application running 24/7. You’ll need to go through and turn off or disable several different automatic settings to keep things from popping up over top of your application. Some of these screens have subtle changes depending on the OS version and whether you're on a desktop or laptop. Some settings have disappeared or been obscured since writing this in 2012 and may require a quick search to find if they are still accessible.

In System Preferences, you'll need to make some changes to each of these:

![System preferences](images/Relevant_System_Settings.png)

- ##### Screensaver

	Disable your screensaver. Set it’s time to **Never** 
      
- ##### Desktop

	I also suggest changing your desktop background to either black, a screenshot of your app, or your client's logo. Having the MacOS default backgrounds show up is a dead giveaway that something is wrong, and having the background be less loud can help fly under the radar. Another reason to do this is because of this simple fact: _it's not really broken until someone notices :)_

	If you're running multiple screens or computers, I've also found it helpful to make desktop backgrounds that have numbers, names or colors in them so you more easily tell them apart if you're mapping them together or something like that.

- ##### Energy Saver
    - Turn Display Sleep and Computer Sleep to **Never**. 
    - Enable “Start up automatically after power failure” and “Restart automatically if the computer freezes” (these are only available in 10.7 and later)
    - Restart automatically after computer power failure or kernel panic is enabled by default as of 10.8. You can view the current status of both of these settings in the terminal with the following command: `sudo systemsetup -getrestartfreeze -getrestartpowerfailure`
     
     `systemsetup` in the terminal is actually a great way to check and potentially script all of these settings. Maybe the next version of this article will put together a script that sets many of these with a simple command.
     
 ![Power_settings](images/PowerSettings.png)

- ##### Security
    These tips in particular open up a range of vulnerabilities. Proceed with caution.
    
    I would make sure that **"Disable Automatic Login"** is unchecked so that your computer boots to the desktop instead of the password entry login screen. More about this in the following section.

    If necessary, for macOS 10.12 and beyond, you can re-enable and show the "Allow apps downloaded from Anywhere" option with this command:
    ```bash
      sudo spctl --master-disable
      ```
 ![SecuritySettings](images/Security_settings.png)

- ##### Users and Groups
    Go to Login Options (above the padlock) and enable "Automatic Login" for the user that will be running the installation.
    
    **IMPORTANT:** If you have any security concerns _at all_ do  not automatically login to an admin user. Create a new standard user and use this setting to login to that account. Using a standard user may make certain sudo commands more difficult though.

    ![Login_items](images/Auto_login.png)

- ##### Software Update
    Disable automatic updates. Again, this could be a security risk down the line, but it's helpful if future versions of MacOS break something in your app.
      

 ![Update_disable](images/Auto_update_disable1.png)
  ![Update_disable](images/Auto_update_disable2.png)


- ##### Sharing
    If you are running your main computer without a monitor or if it's in an inaccessible area, it can be a lifesaver to turn on File sharing and Screen sharing. This will allow you to access the computer and control it if you're on the same network (optional if you’re concerned about security). Screensharing is built into MacOS and you can access computers from a finder window with the Network sidebar item and click screenshare. 

 ![SharingSettings](images/Sharing_settings.png)

 - ##### Network
    Your computer should almost always be hardwired to the network with ethernet - do not trust wifi :)
    
     However, If you don't need remote access or don’t need internet access for the installation, it’s not a bad idea to disable the Wifi completely. If Wifi is turned off, the “Please select a Wireless Network” window won't pop up when you least expect it. You can also turn off the option to ask you to join a new network if the proper one isn't found.

 - ##### Bluetooth
    If running without a mouse or keyboard plugged in, sometimes you can get the annoying  ”Bluetooth keyboard/mouse setup” pop up over your application. You can temporality disable these by going to the advanced settings within the Bluetooth Preferences. See below for its location after clicking Advanced on the Bluetooth setting.

 ![BluetoothSettings](images/Bluetooth_settings.png)


 - ##### Notification Center and Popups
 
You can either [disable Notification Center completely](http://www.tekrevue.com/tip/how-to-completely-disable-notification-center-in-mac-os-x/) (requires disabling SIP) , or set your "Do Not Disturb" to basically on be on forever by setting it with overlapping times like the screenshot below

![Notification_Center](images/Notification_Center_disable.png)

You can also disable the "This Application Unexpectedly Quit" modal popup and the subsequent bug report that comes with it by running this command in terminal OR renaming the Problem Reporter app. Just use with caution since you won't see certain important crash messages otherwise.

_(Requires disabling SIP...see below)_

```bash
sudo chmod 000 /System/Library/CoreServices/Problem\ Reporter.app
```

 - ##### System Integrity Protection
 
**Note:** As of macOS 10.11 some system settings can only be altered by turning off Apple's System Integrity Protection (SIP) setting. It is recommended that you leave SIP enabled unless you absolutely need to disable it. For example, if you would like to completely disable the Notification Center by unloading the launch agent you must disable SIP.

As Apple describes it : "System Integrity Protection is a security technology in OS X El Capitan and later that's designed to help prevent potentially malicious software from modifying protected files and folders on your Mac. System Integrity protection restricts the root user account and limits the actions that the root user can perform on protected parts of the Mac operating system"

SIP will not allow you (even if you are an admin) to modify files or settings located in
* /System
* /usr
* /bin
* /sbin
* Apps that are pre-installed with OS X

To disable SIP
1. Restart your Mac.
1. Before OS X starts up, hold down Command-R and keep it held down until you see an Apple icon and a progress bar. Release. This boots you into Recovery.
1. From the Utilities menu, select Terminal.
1. At the prompt type the following and then press Return: `csrutil disable`
1. Terminal should display a message that SIP was disabled.
From the  menu, select Restart.

- ##### Other Tips

Another useful tool for modifying certain MacOS .plists for disable or enabling certain things is [Tinkertool](http://www.bresink.com/osx/TinkerTool.html) You can use this to disable or enable certain things that System Preferences doesn't cover.

For other odd things, I would also look at this filepath and you can rename files in here to temporarily disable certain system services them on the computer you're using: `/System/Library/CoreServices` (requires disabling SIP)

You can rename "Notification Center" to "Notification Center_DEACTIVATE" or something (or you can move it) - and then you won't get any obnoxiously "helpful" Notification Center popups. (requires disabling SIP)

After MacOS 10.9 - Apple enabled this strange feature called App Nap that detects when an App isn't doing much and makes it use even less resources - could be problematic - [check this page out for how to disable for now](http://www.tekrevue.com/tip/disable-app-nap-os-x-mavericks/)

If necessary, You can also hide all of the desktop icons with this terminal command:

```bash
defaults write com.apple.finder CreateDesktop -bool false;
killall Finder
```
To re-enable the desktop run the same command but set the bool to 'true'


## Boot into your software
-------------------------------

Sometimes things get unplugged, the power goes out, or you might just need to restart to fix some OS issue. Above, I covered how to have the computer reboot automatically after power failures or freezes, but you’ll also need your app to be ready to go after booting up, and not just sit on the desktop or login screen. 

There are many ways to have your application load automatically after restarting, and I'm going cover the simplest one here but a more complex but "safer" approach in the next section

The simplest method is to use MacOS's built in tools. In the System Preferences “Users and Groups” panel, select “Login Items” and drag your application into there to have it open automatically on launch.

![Login Items](images/Login_items.png)

If you need to have multiple things happen on reboot, Apple's Automator is worth looking into, but I've found it problematic for certain cases and I recommend investing in the shell script and LaunchDaemon approach covered in the next section. However, for short runs or really simple needs, its a great tool. [Automator](https://developer.apple.com/library/content/documentation/AppleApplications/Conceptual/AutomatorConcepts/Articles/AutomatorOverview.html#//apple_ref/doc/uid/TP40001508-BCIJAFHH).

Using Automator, you can easily create complicated startup sequences that include delays and shell scripts as needed.

![Automator Application](images/automator_example3.png)

After you've created and tested your automator script you can save it as an application, and add it to your Login Items list like a regular app.

Using the Login Items approach to loading your app on reboot is a great simple solution. However, your app will only open it once on reboot. If the app crashes, it will just display the "Unexpectedly Quit" modal until someone comes along to fix it manually. In the next section, we'll cover how to have MacOS continually check and relaunch your app.


## Keep it running Forever
---------------------------


There are a couple ways to make sure your application starts up and stays up, and some methods offer some more customizability than the Login Items approach covered above. My personal preference is to use Launch Agents because it's the simplest method, has some good options, and it's really the intended use case for them. Also - these methods should not be combined, otherwise you run the risk of having the OS open two versions of your app and slowing everything down.

Coming up we'll discuss making a Launch Agents plist file yourself, or you can use a third party helper application to make them for you. An alternative to Launch Agents is to use a cronjob (a system job that runs on a schedule) and pair that with a shell script - we'll discuss that as well.

Please note, some of the methods are really only for apps and not for project files that are opened by apps. For example, if you have an Ableton Live project file that you want to boot into, do not try to use that project file with a Launch Agent. The reason for this is, Launch Agents are intended to start a process, and a project file isn't the parent of the process, so things don't always work as intended. If you need to boot into a project file AND make sure the app doesn't crash, you may need to come up with a custom approach mentioned later.


#### Launch Agents

Launch Agents are a standard feature of MacOS and are used to automatically launch many of the core system services and other third party services. They are run at login and exist as plist files that live in:

 - `/Library/LaunchAgent` if you are running the app for all users
 - `~/Library/LaunchAgent` if you are running for just the logged in user

The [difference between a Launch Daemon and a Launch Agent.](http://www.grivet-tools.com/blog/2014/launchdaemons-vs-launchagents/) Basically, they are different flavors of the same thing. Use a LaunchAgent if you want it to run on Login, and a LaunchDaemon if you want it to run on reboot (and be running if the computer is waiting to log in). In general, if you're reading this guide, you are probably working with a fullscreen visual app and not a background hidden service, and you'll just want to use a Launch Agent.

If you want a deeper explanation on both, here is an [Apple Doc](http://developer.apple.com/library/mac/#documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html) on using Launch Agents and Launch Daemons in various ways.

Personally, I find it easier to use third party apps for ease and more assurance that I've got it right, but I'll briefly cover the manual method. You may also want to manually adjust some things that are missing from the options in the third-party softwares.

#### Making Launch Agents Manually
If you want to make a LaunchAgent yourself, you'll also be making use of the terminal command `launchctl` to load, unload and test your process as you make it - or you can just reboot.  I would follow one of the guides above, take a look at `man launchd.plist`, take a look at some of [admsyn's](https://gist.github.com/admsyn/4140204) notes, take a look [here](https://www.launchd.info) or use this as a template (I generated this from Lingon). 

```XML
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>KeepAlive</key>
	<dict>
		<key>SuccessfulExit</key>
		<true/>
	</dict>
	<key>Label</key>
	<string>TextEdit4Evr</string>
	<key>ProcessType</key>
	<string>Interactive</string>
	<key>ProgramArguments</key>
	<array>
		<string>/Applications/TextEdit.app/Contents/MacOS/TextEdit</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
</dict>
</plist>
```
Notable things in the above example:

 - `KeepAlive` - This tells the OS that if this app isn't running, try and start it up again
 - `SuccessfulExit` - Related to `KeepAlive` - if this key is included, the app will not automatically relaunch if it has a clean exit - i.e. if you manually quit it versus it crashing. If this isn't set, you may get frustrated with the app opening itself over and over when you try to quit it during testing.
 - `ProcessType` - This controls the resources allowed by the app - for example, if this were a background app it would be throttled by other apps. You should set it to Interactive for full use of resources. From the man page: "If left unspecified, the system will apply light resource limits to the job, throttling its CPU usage and I/O bandwidth." This is not an available option in Lingon.
 - `Program Arguments` This is for the filepath to the executable. **Note!** this should be the path to the app within the .app package, not the path to the app. The path is typically `YourProgram.app/Contents/MacOS/YourProgram` - which can be found by right-clicking on the app and selecting "Show Package Contents" and navigating to it
 - `RunAtLoad` - This just specifies to run this process when logging in
 - `Label` just the name of the Launch Agent to the system

 There are many other potentially useful keys that are listed in the `man` page for launchd.plist - you may, for example, want to run something every 5 minutes or every hour or once a week, and there is a scheduler for that.

#### Third Party Apps for creating Launch Agents

Neither of these apps are free, so make sure to have your credit card ready. [LaunchControl](http://www.soma-zone.com/LaunchControl/) is a solid option that has more options than Lingon, but can be a bit more confusing. [Lingon](https://www.peterborgapps.com/lingon/) is a cleaner interface and is overall easier to use, but some options are more hidden or unavailable (Like `ProcessType`).


#### Unusual Cases

The above methods are great for simple standalone apps, but sometimes you have other processes or scripts you want to run at the same time, or maybe you need to have something else happen if your app crashes. In any case, you may be able to adapt some of the examples here to suit your uses case. If you're looking for other shell script examples to learn from, [here are some variations](https://github.com/ruanyf/simple-bash-scripts).

#####Keep app alive without the Launch Agent KeepAlive
You would use the script below if you wanted to have the system check if your process is running, and if it can't find the process, it tries to re-open the specified app. If it detects the app is running, it does nothing. It's not as fast and responsive as the Launch Agent KeepAlive method, but it may still be useful.

```bash
#!/bin/bash
if [ $(ps ax | grep -v grep | grep "Twitter.app" | wc -l) -eq 0 ]
then
echo "Twitter not running. Re-opening..."
open /Applications/Twitter.app
else
echo "Twitter running" 
fi
```

[Here](ScriptExamples/KeepOpen.sh) is an example file with the above.

You would take the above, paste it into a text file, and replace Twitter.app and the path to the .app with your own custom values. Please note that shell scripts can open the .app files and don't need to be pointed to the `Contents/MacOS` file that that launchd.plist's do.

Save that file as something like “KeepTwitterOpen.sh” and keep it next to your application or somewhere convenient. You can test it by opening terminal and typing `sh` and pasting the path to the file.

After creating that file, you’ll need to make it executable to have the system run it on a schedule. To do this, open the Terminal, and in a new window type `chmod +x` and then enter the path to the shell script you just created (you can either drag the shell script into the terminal window or manually type it to fill in the path). It would look something like this:

```bash
4Evr-MacBook-Pro:~ Forever4Evr$ chmod +x /Users/Forever4Evr/Desktop/KeepOpen.sh
```

After you have made it executable, you’re now ready to set it up to run on a schedule. Tip: to test the script, you can change the extension at the end to `.command`  (ie `Keepopen.command` as an alternative to doing that whole `chmod +x` business - this allows you to double click it to run it.

To run the script on a schedule (ie every minute), I recommend using a Launch Agent and scheduling it to run every minute. You would set your launchd.plist file's `ProgramArguments` path to the "KeepOpen.sh" file instead of an app. In a future section on logging, you could also add things to this script that log the app's status to a text file.

An alternative to launchd scheduling is to use a cronjob, but I suggest using either one OR the other. Using both might get confusing and they won't know about each other. In any case, you can read more about cronjobs [here](https://ole.michelsen.dk/blog/schedule-jobs-with-crontab-on-mac-osx.html).

##### Force your app to quit
Alternatively, sometimes you just need to force your app to quit to make sure it doesnt get stuck on shutdown or something. You can use some variation on the following. 



Using `killall` is not a "Safe" shutdown method and may result in loss of data and other things, so use with caution. [Here](ScriptExamples/QuitAppScript.sh) is an example of how you kill an app, and how to kill a background process that may run differently.

## Reboot periodically
---------------------------

Rebooting nightly or weekly is a little more preventative (or maybe superstitious). Depending on your app and the amount of stuff it reaches into, there could be some memory leaks or other OS bugs that you haven’t accounted for. Rebooting every day or week seems to be a good idea to keep things running smoothly.

The simplest option by far would be to go to System Preferences->Energy Saver and then click “Schedule…” on the bottom right. You can set the computer to totally shut down and then start itself back up in the morning if you want to save energy or wear and tear. Just know that this can do funny things sometimes.

![Auto-reboot](images/Auto_reboot.png)

## Check in on it from afar
---------------------------------

There are a bunch of options here from various paid web services like:

 - [Logmein](http://www.logmein.com/)
 - [Teamviewer](http://teamviewer.com/)
 - [Jump Desktop](https://jumpdesktop.com)


There is also VNC (many options for this: [RealVNC](http://realvnc.com/) and Chicken of the VNC tend to come up a bunch) to [SSHing](http://www.mactricksandtips.com/2009/06/ssh-into-your-mac.html). The choice here depends on your comfort level and how much you need to do to perform maintenance from far away. Also - see later sections for tips on logging the status of your app as an alternative way and notifying yourself if something goes down.

Leaving a Dropbox connected to the computer and your own is super useful for file swaps between the two computers. Although most remote screensharing services have file sharing built in, Dropbox is just a nice, fairly transparent option if you just need to pass files.


## Test Test Test
-------------------------

Some of the above methods work flawlessly every time. 

Sometimes they don't. 

I'ts really important to test everything in this list and make sure it all works. I have had great results with just testing overnight reboots in the week or two running up to the installation. There is also almost always something that gets changed in the final setup on site, so make sure you run a few tests in the final environment prior to leaving it.

You can’t account for everything, so don’t beat yourself up if something does eventually happen, but this list will hopefully alleviate a little bit of frustration. Good luck!


## Logging and Notifications
------------------------

If you have an installation that runs for weeks or months, you might want a way to keep tabs on it that doesn’t involve remotely logging in and checking on it. A good thing to have would be to have something on the system that writes certain info to a local text file, or ,even better, write log files to a local web server so you can monitor and get notifications.

I have turned all of these into examples that can be found in this repository [here in ScriptExamples](ScriptExamples). You will need to adapt the filepaths and other elements to suit your needs and probably combine scripts.

####Basic Uptime logging
There are a couple things you can do to log data depending on what you want to know about the state of your installation. Let's take a look at PS

There is a terminal command you can use to get a list of all of the currently running processes on your computer: `ps aux`

More info above ps commands [here](https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man1/ps.1.html)))

Furthermore you can filter this very long list to only return applications you want to track by using the | (pipe) and then `grep` (note that grep is case sensitive and `grep -v grep` just removes the grep command itself from the process list):

`ps aux | grep "TextEdit" | grep -v grep`

This will return a line like this:

```
    USER             PID  %CPU %MEM      VSZ    RSS   TT  STAT STARTED      TIME COMMAND
    BlairNeal       71564   0.4  1.7  4010724 140544   ??  S    Sun03PM  14:23.76 /Applications/TweetDeck.app/Contents/MacOS/TweetDeck -psn_0_100544477
```

Now you have the following useful info: CPU usage, Memory usage (as percentage of total memory), Status, Time Started, Time Up, and the name of the process

All that is left is to write this output to a text file, which you can do with a line like this:

    ps aux | grep "TextEdit" >> /Users/Forever4Evr/Dropbox/InstallationLogs/BigImportantInstall/Number6ProcessLog.txt

This line basically says - tell me the open processes (px aux), and then only give me the lines that have "TextEdit" in them (grep TextEdit) - and then append them to a text file located at this location ( >> path_to_text_file). I also suggest adding in another line like `date >> path/to/your/log/file` just to confirm when the error happened.

Now we just need to make this an executable shell script and set it up as a launch daemon or cron job depending on your preference – see above at Step 3 to learn how to run the shell script at a regular interval using Lingon and launchd. 

If the app isn’t running, it will only return the “grep YourAppName” process which is a good thing to log because if your app isn’t open you won’t know how long it’s been out (nothing will be logged), but having the grep process logged will at least tell you it was checking for it. Grep will also more accurately tell you what time it checked – the other app will only give you a start time and up time.

#### Logging other data

Let’s also take this one step further and say that a display or projector is having trouble staying on consistently and it's messing up your app's ability to go full screen. Well, we can log the currently available resolutions too! Try entering the line below in your own terminal:

    system_profiler SPDisplaysDataType

This will return a list of connected displays and some metadata about them including resolution and names.

Let’s say you want to make sure you’re running a resolution of 3840×720 at all times, or you want a log of resolution changes. You would do something like:

    system_profiler SPDisplaysDataType | grep Resolution

This will return “Resolution: 3840×720″ which you can combine with the above lines to write it all to a text file. So here would be your shell script file if you wanted to record the currently running processes and the current resolutions:

        #!/bin/bash
    ps aux | grep 'YourAppName' >> /Users/you/filepath/Install6ProcessLog.txt
    system_profiler SPDisplaysDataType | grep Resolution >> /Users/you/Dropbox/Install6ProcessLog.txt

Finally, maybe you want to grab a fullscreen screenshot at a regular interval too, just to make sure there is no funkiness happening that you can’t see…well you could add this line to the above as well:

    screencapture ~/Desktop/$(date +%Y%m%d-%H%M%S).png

This will save a screenshot to the desktop (you should probably specify your own file path) with a formatted date and time. You may want to do this every hour instead of every 5 minutes since it’s a big chunk of data and it may cause some issue with your screens. As usual – test before deploying! You can combine it with [this](http://pdaddy.wordpress.com/2007/03/02/shell-script-to-delete-all-but-the-n-newest-files-in-a-directory/) to just keep the 10 most recent screenshots. You may also want to screenshot when an app crashes.

Bonus points would be to create an auto-generated table and webpage that takes all of this info and puts it into a nice view that you can use to check all of your installations at a glance.

#### Error notification

Logging isn't always enough. You may get a call from a client several months in where they claim the installation hasn't been running for a week. If you had a notification system in place, you would have caught something like that immediately. You can also pop up more system alerts for the user as well.

There are probably much more sophisticated ways to do this, but you can pop up system alerts using Apple's built-in Applescript and use this line in a shell script:

`osascript -e 'tell app "Finder" to display dialog "From LogStatus - Display Not Connected! Please contact support at 867-5309"'`

Or you can get fancier and use notification center alerts like this:

`osascript -e 'display notification "From LogStatus - Display Not Connected! Please contact support at 867-5309" with title "Log Alert"'`

For the above, I have prepared example script files that you could maybe adapt or combine to your own purposes. You can view them [here](ScriptExamples/PopupAlertWhenNoDisplay.sh).

The one of the fanciest solutions is to actually send yourself or your team a Slack message when something crashes. I'm looking forward to seeing how dated this seems in another 5 years. Also, I don't know about the security ramifications of opening up a webhook to post to slack and leaving it in a script file - there are probably much better ways to do this in general. 

For Slack messaging, first I recommend starting with [this guide](https://api.slack.com/tutorials/slack-apps-hello-world) to set up a webhook. Coming out of that, you'll have a URL you can place into a CURL command which you can run from a shell script. It will look something like this:

`curl -X POST -H 'Content-type: application/json' --data '{"text": "Your app isn't running", "color": "#9C1A22"}' YOUR_WEBHOOK_URL`
`
You can see a more complete example of the slack implementation [here](ScriptExamples/KeepOpenAlertSlack.sh).




### Uncategorized and Out of Date Tips
-------
####Deploying an image to multiple computers and backing up:
If you’re setting up multiple computers, you can do these prep steps on one of them and just boot the others into target disk mode and use something like [Carbon Copy Cloner](http://www.bombich.com/) to mirror the first one on the next so everything is as consistent as possible. I've noticed a few things don't always transfer like sleep and screensaver settings, so make sure to double check those are sticking.

For Windows and Linux, I highly recommend the use of [Clonezilla](https://clonezilla.org) - on its surface it looks junky, but it is actually incredibly well made and robust if you can deal with the command line interface. I have used it on multiple WIndows and Linux projects and it's often worked like a charm. I first had to use it to clone a single disk image from one Windows 10 laptop to 150 identical laptops for an installation. I was able to set up an assembly line process with Clonezilla where I cloned one 15gb image to 150 computers in about 2 days with a thumbdrive. Clonezilla also offers the ability to work over a network connection if you are able to hardwire all of your computers and push an image out that way.

Clonezilla and Carbon Copy Cloner are also a great tools for creating a backup image of a computer. Once you have the image, you can have it stored in the cloud or a company server in the event the installation computer fails and you don't want to start this setup from scratch.

#### Getting an IP address out loud
Determining the IP of the machine on a dynamically allocated network can be a pain, especially in screenless/headless installations. To make this a little easier, Robb Godshaw wrote a little Automator Script that says the IP aloud using Text-to-Speech 30 seconds after the computer boots. [Download link on Instructables.](http://www.instructables.com/id/Configuring-a-Mac-for-an-always-on-operation/steps/9)

#### Automator Calendar actions
_[I don't recommend this in 2019 - the calendar app and automator are problematic. Learning to do this with Launchd is a much safer and more reliable option - but I'll leave it here anyway]_

Another option for rebooting an app periodically (if you don’t want to deal with the terminal and shell scripting) is to use iCal to call an Automator iCal event. This method is perhaps a little easier to schedule and visualize when you will reboot. Within Automator, create a new file with the iCal event template to do something like this:

![Automator Shell Script](images/Automator_example2.png)

Run it to see if it does what you expect and then save it out. When you save,it will open in iCal as an action that gets opened. Just set it to repeat as often as you’d like. You can also set things like having it email you when it reboots or runs the script.

If you’d like to just close your programs and re-open them, do something like this (the pauses are so the quitting and re-opening stuff has time to actually execute):

![AutomatorPause](images/Automator_example.png)

#### Constantly try to re-open your app:

I don't know that I ever used this, but I'm leaving it here. 

If you don't want to use the Launch Daemon scheduler - this one is a bit more dangerous, but should work. Once loaded, this script will just continuously try and open your app every 100ms, but if it is already open, the OS won't (usually) try to open it multiple times


```bash
#!/bin/bash
while true
do
#using open to get focus
echo "Trying to open your app"
open -a filepath/to/your/.app
sleep 100
done
```

#### Email logs
[I have made this an out-of-date tip because I've never actually used this in production, and I think some of it no longer works - it would be much better to set up a web service that receives log files and images...or even a Slackbot, those are super easy to set up with curl commands from a bash script]

If the process logger isn’t enough, we can use what we learned in that process to actually set up a system to email you if something is amiss so you don’t have to manually check it. We can do this all with the command line and internal tools, it’s just a more involved setup. This is going to be fairly general and will need some tuning in your specific case.

First you will need to configure postfix so you can easily send emails from the terminal – [follow the instructions here as closely as possible](http://benjaminrojas.net/configuring-postfix-to-send-mail-from-mac-os-x-mountain-lion/)

If you were using a gmail account you would do:

*InstallationSupport@gmail.com*

*pass: yourpassword*

The line in the passwd file mentioned in the article would be: smtp.gmail.com:587 installationSupport@gmail.com:yourpassword

Now send a test email to yourself by running: echo “Hello” | mail -s “test” “InstallationSupport@gmail.com”

Second step is to combine this new found ability to send emails from the Terminal with a process to check if your application is still running…something like the below would work with some tweaking for what you’re looking to do:

    #!/bin/sh
    if [ $(ps ax | grep -v grep | grep "YourApp.app" | wc -l) -eq 0 ] ; #Replace YourApp.app with your own app's name     
    then
            SUBJECT="Damn, it broke"
            EMAIL="InstallationSupport" #this is the receiver
         EMAILMESSAGE="This could be for adding an attachment/logfile"
         echo "The program isn't open - trying to re-open">$SUBJECT
         date | mail -s "$SUBJECT" "$EMAIL"  "$EMAILMESSAGE"

            echo "YourApp not running. Opening..."

        open /Applications/YourApp.app #reopen the app - set this to an exact filepath
    else
        echo "YourApp is running"
    fi

Now you just need to follow the instructions from Step 3 above to set this shell script up to run with launchd – you can check it every 5 minutes and have it email you if it crashed. You could also adapt the If statement to email you if the resolution isn’t right or some other process condition.

#### Cronjob process keepalive
This method is sort of deprecated in relation to the launchd method - you can run shell scripts with Lingon and launchd in the same manner as what we've got here. Shell scripting is your best friend. With the help of the script below and an application called CronniX (or use Lingon) , you will be able to use a cronjob to check the system’s list of currently running processes. If your app does not appear on the list, then the script will open it again, otherwise it won’t do anything. Either download the script or type the following into a text editor, replacing Twitter.app with your app’s name and filepath. Don’t forget the “.app” extension in the if statement:

	!/bin/sh
		if [ $(ps ax | grep -v grep | grep "Twitter.app" | wc -l) -eq 0 ]
		then
		echo "Twitter not running. opening..."
		open /Applications/Twitter.app
		else
		echo "Twitter running" 
		fi

Save that file as something like “KeepOpen.sh” and keep it next to your application or somewhere convenient.

After creating that file, you’ll need to make it executable. To do this, open the Terminal and in a new window type “chmod +x ” and then enter the path to the shell script you just created (you can either drag the shell script into the terminal window or manually type it). It would look something like this:


    4Evr-MacBook-Pro:~ Forever4Evr$ chmod +x /Users/Forever4Evr/Desktop/KeepOpen.sh

After you have made it executable, you’re now ready to set it up as a cronjob. Tip: to test the script, you can change the extension at the end to KeepOpen.command as an alternative to opening it with Terminal, but the same thing gets done.

Cronjobs are just low level system tasks that are set to run on a timer. The syntax for cronjobs is outside of the scope of this walkthrough, but there are many sites available for that. Instead, the application CronniX can do a lot of the heavy lifting for you.

After downloading CronniX, open it up and create a new cronjob. In the window that opens,  in the command window, point it to your KeepOpen.sh file and  check all of the boxes in the simple tab for minute, hour, month, etc. This tells the job to run every minute, every hour, every day, every month. If you want it to run less frequently or at a different frequency, play around with the sliders.

![Cronnix_link](images/Cronnix-settings.png)

Now just hit “New” and then make sure to hit “Save” to save it into the system’s crontab. Now if you just wait a minute then it should open your app every minute on the minute. Maybe save this one for the very end if you have more to do :)

This is a great tool if there is an unintended crash because the app will never be down longer than a minute.


#### Memory leak murderer
In 2019 I don't recommend this as a best practice, but its more of a thought experiment about how to catch an app with a memory leak and reboot it if you didn't catch it during development.

See [this article](http://blairneal.com/blog/memory-leak-murderer/) about combining process with something that kills and restarts an app if it crosses a memory usage threshold

####Madmapper Applescript

[Note: Unsure if this still works in 2019.] If using MadMapper – see [this link](http://blairneal.com/blog/applescript-to-automatically-fullscreen-madmapper-for-installations/) for an AppleScript that will open MadMapper and have it enter fullscreen – and enter “OK” on a pesky dialog box.

## Alternate resources:
--------------------
The original outdated version of the article from 2012 is [here](http://blairneal.com/blog/installation-up-4evr/) 

### MAC OS X

Other useful shell commands for MacOS [here](https://github.com/herrbischoff/awesome-macos-command-line)


This is an amazing addon for openFrameworks apps that keeps your application open even after a large range of failures: [ofxWatchdog](https://github.com/toolbits/ofxWatchdog
)
[http://vormplus.be/blog/article/configuring-mac-os-x-for-interactive-installations](http://vormplus.be/blog/article/configuring-mac-os-x-for-interactive-installations
) - it definitely has its quirks depending on your installation and it can really interfere with some of the other tips in this guide, but it has been a lifesaver for a few of my installations.

[Similar guide meant for live visuals/VJing](http://vjforums.info/wiki/setting-up-os-x-for-vjing/)

[Nick Hardeman's utility for setting all of these from one location](http://nickhardeman.com/610/openframeworks-configuring-osx-for-a-long-term-installation/)

Nick Hardeman's [ofxMacUtils from 2015](https://github.com/NickHardeman/ofxMacUtils) used for helping create a one stop shop for setting common system settings for installations

### LINUX

[Ubuntu Guide from Branger Briz](https://github.com/brangerbriz/up-4evr-ubuntu)

[ofBook guide](https://github.com/openframeworks/ofBook/blob/master/chapters/installation_up_4evr_linux/chapter.md)

### WINDOWS

[Windows Version from Branger Briz](https://github.com/brangerbriz/up-4evr-windows-10)

If you’re looking for help with this task with Windows, check out this awesome script [StayUp](http://www.bantherewind.com/stayup) from Stephen Schieberl. Also for Windows: http://www.softpedia.com/get/System/File-Management/Restart-on-Crash.shtml and this tool for scripting OS operations on windows http://www.nirsoft.net/utils/nircmd.html

Check out this great step by step from EVSC: http://www.evsc.net/home/prep-windows-machine-for-fulltime-exhibition-setup

### VR 

[Here](https://github.com/wjrro/vr-up-forever) is a style of guide intended for permanent VR setups
