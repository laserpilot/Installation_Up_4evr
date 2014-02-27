
At work I recently had to set up a four installations of different configurations that would need to run all day, every day, 24 hours a day for a couple months with as few crashes or glitches as possible and without anyone going to check on them. This is something that a lot of media artists need to do all the time, and there are a bunch of different tricks and tips to keeping things up for an extended period, I figured I’d share my findings. There are alternate ways to do many of these tasks and this is only one road so please share some tips you’ve picked up out in the field down in the comments box below.

I had to do several searches in a couple different places to find all the information I needed to keep everything consistently up and bug free. Luckily most of the installations I was dealing with this time were fairly light in terms of resources and complications, but it’s always best practices to have a safety net.

I usually run these off brand new, unboxed computers so this is sort of starting from scratch. Most of the things I point out are set to the opposite by default.

Tip: if you’re doing multiple computers, do these prep steps on one of them and just boot the others into target disk mode and use something like Carbon Copy Cloner to mirror the first one on the next so everything is as consistent as possible.

**Step 1: Prep your software and the computer**
-----------------------------------------------

When building your software or whatever it might be, always keep the long running installation in mind. Plan which things will need to be adjusted by whoever is watching over the installation from the beginning (or at least don’t save it for the end). In my experience, keep it as simple as possible, so that it’s easy for the caretaker to get in there to fix or adjust what they need without opening Xcode and compiling or even exiting out of your app. Time you spend now to make things simple will save you hours of remote debugging when something breaks.

You’ll need to go through and turn off or disable several different automatic settings to keep things from popping up over top of your application. This can differ depending on whether you’re running 10.6, 10.7, 10.8, 10.9 etc etc.

In System Preferences:

 - **Desktop and Screensaver:** Disable your screensaver. Set it’s time to “Never." I also suggest changing your desktop background to either black/a screenshot of your app/you client's logo
 - **Energy Saver:** Turn Display Sleep and Computer Sleep to Never. Enable “Start up automatically after power failure” and “Restart automatically if the computer freezes” (these are only available in 10.7 and later)
 - **Users and Groups:** ->Login Options: Enable Automatic Login
 - **Software update:** Disable automatic updates.
 - **Notifications:** Disable any potential Notification Center alerts (banners or popups) from specific apps
 - **Sharing:**  If you are running your main computer without a monitor or in an inaccessible area, don’t forget to turn on File sharing and Screen sharing. This will allow you to access the computer and control it if you're on the same network (optional if you’re concerned about security).
 - **Network:** If you don’t need remote access or don’t need Internet access for the installation, it’s not a bad idea to disable the wifi so the “please select a wireless network” window doesn’t pop up when you least expect it.
 - **Bluetooth** :If running without a mouse or keyboard plugged in, sometimes you can get the annoying  ”Bluetooth keyboard/mouse setup” pop up over your application. You can temporality disable these by going to the advanced settings within the Bluetooth Preferences. See below for it’s location in 10.6.
 - **Security:** I would make sure that "Disable Automatic Login" is unchecked so you don't hit any surprises on reboots. If you’re really paranoid, you can even disable things like the IR remote receiver that still exists on some macs and definitely on Macbooks. This would keep pranksters with Apple TV remotes from “Front Rowing” your installation. To disable, go to Security->General->Advanced (in >10.8) and “Disable remote control IR receiver”.

![BluetoothSettings][1]
![SecuritySettings][2]
![SharingSettings][3]
![Login_items][4]

You can also disable the "This Application Unexpectedly Quit" and the subsequent bug report that comes with it by running this command in terminal OR renaming the Problem Reporter app:

    sudo chmod 000 /System/Library/CoreServices/Problem\ Reporter.app


Another useful tool for modifying certain OSX .plists for disable or enabling certain things is [Tinkertool][5] You can use this to disable or enable certain things that System Preferences doesn't cover.


Step 2: Boot into your software
-------------------------------

Things get unplugged, power goes out, not everyone has budget or space for a battery backup etc etc. Above, I covered how to have everything reboot automatically after power failures or freezes, but you’ll also need your app to be ready to go from boot and not leave the desktop open to prying eyes. There are many ways to have your application load automatically - the simplest is using OSX's built in tools: In the System Preferences “Accounts” panel, select “Login Items” and drag your application into there to have it open automatically on launch.

![Login Items][6]

Step 3: Keep it up (champ!)
---------------------------

There are several ways to make sure your application goes up and stays up - 

•••Launchd

Using Launch Daemons is an alternate way to get apps to load on boot and to continuously re-open them if they go down. Launchd plists are very useful alternatives to cron jobs and can be used to run things on a periodic basis or on calendar days. You could achieve similar results with a combination of automator and iCal, but it depends on what you’re comfortable with.

Here is an [Apple Doc][7] on using Launch Agents and Launch Daemons in various ways.

The [difference between a Launch Daemon and a Launch Agent][8] (Basically whether you need it to run when a user is logged in or not…for most simple options like launching a regular app, you’ll just want a Launch Agent)

A launchd example from admsyn: https://gist.github.com/4140204

Of course you could make the launchd plist yourself for free from a template like above. One quick method to setting up Launchd is to use Lingon ($4.99 in the App Store) or [Lingon X][9] 

In Lingon, hit the + to create a new launchd plist. Just make it a standard launch agent. Now Set up your plist like so:

![LingonSetup][10]


  [1]: https://raw.github.com/laserpilot/Installation_Up_4evr/master/Images/Bluetooth_settings.png
  [2]: https://raw.github.com/laserpilot/Installation_Up_4evr/master/Images/Security_settings.png
  [3]: https://raw.github.com/laserpilot/Installation_Up_4evr/master/Images/Sharing_settings.png
  [4]: https://raw.github.com/laserpilot/Installation_Up_4evr/master/Images/Auto_login.png
  [5]: http://www.bresink.com/osx/TinkerTool.html
  [6]: https://raw.github.com/laserpilot/Installation_Up_4evr/master/Images/Login_items.png
  [7]: http://developer.apple.com/library/mac/#documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
  [8]: http://techjournal.318.com/general-technology/launchdaemons-vs-launchagents/
  [9]: http://www.peterborgapps.com/lingon/
  [10]: https://raw.github.com/laserpilot/Installation_Up_4evr/master/Images/LingonSetup.png