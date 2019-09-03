#!/bin/bash
#killall just looks for a process with the name Tweetbot and kills it - use with caution depending on names
#the second line is a different approach that is necessary for certain types of apps - prgep is used to get a process ID and that ID number gets passed to kill to be shut down
killall TextEdit
kill `pgrep TextEdit`
echo "Shutting Down 2 Apps"
