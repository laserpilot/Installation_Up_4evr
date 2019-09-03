 
 #!/bin/sh

#essentially this if statement is using the "test" command with the brackets (thats one syntax form of test) - read more here: https://www.lifewire.com/test-linux-command-unix-command-4097166 -
#-Check the currently running system processes with ps ax
# return any lines that have TextEdit.app but ignore anything with grep
# wc is a command for wordcount and the -l means to return the number of lines. If the number of lines is equal to 0, checked by -eq 0 then it means the app isn't running in the process list and it should try to re-open it.

# make sure to track the syntax for if statements - they are easy to break in shell scripts

 if [ $(ps ax | grep -v grep | grep "TextEdit.app" | wc -l) -eq 0 ]
    then
        echo "TextEdit not running yet. Opening..."
        open /Applications/TextEdit.app
    else
        echo "TextEdit already running - will not open duplicate"
#you could optionally log something to a file here if you want proof that this script was running, see other scripts for examples
    fi
