#!/bin/bash
osascript -e "quit app \"twitterTimeline\""
#osa script does not appear to work properly with ofxWatchdog - switching to killall
killall twitterTimeline
kill `pgrep Curator`
echo $"Shutting Down Timeline App and Curator"