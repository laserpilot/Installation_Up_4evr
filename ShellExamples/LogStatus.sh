#!/bin/bash
FILE_PATH="SampleLog.txt"

echo "====================SystemStats\n" >> $FILE_PATH
date >> $FILE_PATH
echo "\n" >> $FILE_PATH
ps aux | grep '%CPU' >> $FILE_PATH
ps aux | grep 'Tweetbot' >> $FILE_PATH
ps aux | grep 'Slack' >> $FILE_PATH


#use the following if you have serial devices
#echo "================================" >> SerialLog1.txt
#date >> SerialLog1.txt
#ls /dev/tty.* | grep 'tty.usbmodem12341' >> SerialLog1.txt

#Return if you need to check if a display with 1920 resolution is attached and working - will be blank otherwise

#echo "====================DisplayStatus" >> $FILE_PATH
#system_profiler SPDisplaysDataType | grep 1920  >> $FILE_PATH
#echo "\n\n-" >> $FILE_PATH

#If you need to check the size of a directory
#echo "=======================DirectorySize" >> $FILE_PATH
#du -sh /Path/To/Directory/You/Need/Size/Of >> $FILE_PATH
