 
 #!/bin/sh 
 if [ $(ps ax | grep -v grep | grep "Tweetbot.app" | wc -l) -eq 0 ]
    then
        echo "MyApp not running yet. Opening..."
        open /Applications/Tweetbot.app
    else
        echo "MyApp already running - will not open duplicate"
    fi
