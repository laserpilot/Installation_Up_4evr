 
 #!/bin/sh

#essentially this if statement is using the "test" command with the brackets (thats one syntax form of test) - read more here: https://www.lifewire.com/test-linux-command-unix-command-4097166 -
#-Check the currently running system processes with ps ax
# return any lines that have tweetbot.app but ignore anything with grep
# wc is a command for wordcount and the -l means to return the number of lines
#

 if [ $(ps ax | grep -v grep | grep "Tweetbot.app" | wc -l) -eq 0 ]
    then
        echo "MyApp not running yet. Opening..."
        open /Applications/Tweetbot.app
    else
        echo "MyApp already running - will not open duplicate"
    fi
