#!/bin/bash

#set your own filepath here, but make sure it has a .txt - if the .log file doesnt exist, it will be created
FILE_PATH="DisplayLog.log"

#Use this to flag if a certain display is not connected

if [ $(system_profiler SPDisplaysDataType | grep 1920 | wc -l ) -eq 0 ]
then
#log the error to a file
echo "No 1920px displays connected" >> $FILE_PATH

#You can also have the finder pop up a modal alert - here is an example to pop up
#osascript -e 'tell app "Finder" to display dialog "From LogStatus - Display Not Connected! Please contact support at 867-5309"'

#you can also use notification center if you dont want to pop up a modal that has to be dismissed
osascript -e 'display notification "From LogStatus - Display Not Connected! Please contact support at 867-5309" with title "Log Alert"'

#alternatively, if you use slack, you could make a super simple app that just posts to slack when there is an error: https://api.slack.com/tutorials/slack-apps-hello-world
#using a line like this:
#curl -X POST -H 'Content-type: application/json' --data '{"text":"A Display isnt connected properly! at $(date)"}' YOUR_WEBHOOK_URL

else
echo "Display connected properly at $(date)" >> $FILE_PATH
fi

