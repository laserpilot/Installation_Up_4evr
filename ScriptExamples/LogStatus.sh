#!/bin/bash

#set your own filepath here, but make sure it has a .txt - if the .txt file doesnt exist, it will be created
LOG_PATH="SampleLog.log"

#the -e just allows us to add newline characters and keep the log cleaner
echo -e "\nLog for: $(date)" >> $LOG_PATH
echo -e "====================SystemStats\n" >> $LOG_PATH
#include the column names in the log
ps aux | grep '%CPU' | grep -v grep >> $LOG_PATH
#now include the stats for the apps you care about - will display nothing if the app isn't running
ps aux | grep 'TextEdit.app' | grep -v grep >> $LOG_PATH

#use the following if you need to check how certain displays come up - you may wany to look at the full output of system_profiler SPDisplaysDataType to see what other things you want to add. you can remove the grep if you want to just see all attached displays. this is useful if you need to track whether a display isn't turning on properly

echo -e "====================DisplayStatus\n" >> $LOG_PATH
#system_profiler SPDisplaysDataType | grep 1920  >> $ALL_TEXT
system_profiler SPDisplaysDataType | grep "Display Type"  >> $LOG_PATH
system_profiler SPDisplaysDataType | grep "Resolution"  >> $LOG_PATH
system_profiler SPDisplaysDataType | grep "Online"  >> $LOG_PATH



#Use this command if you need to log or check connected USB devices and their status
#system_profiler SPUSBDataType

#use the following if you have serial devices that you need to make sure are connected
#echo "================================" >> SerialLog1.log
#date >> SerialLog1.txt
#ls /dev/tty.* | grep 'tty.usbmodem12341' >> SerialLog1.log

#Save Screenshot to directory but only keep the 20 most recent files

#If you need to check the size of a directory to make sure its not getting too large
#echo "=======================DirectorySize" >> $ALL_TEXT
#du -sh /Path/To/Directory/You/Need/Size/Of >> $ALL_TEXT

echo "*LogEnd*" >> $LOG_PATH

#also note that this will not truncate the text file and it will just keep growing
