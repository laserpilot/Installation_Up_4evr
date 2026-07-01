 
 #!/bin/sh

#This is a variation on the KeepOpen.sh file that also sends an alert to slack if the app isnt running
#More info about how to set up your app and get a webhook here: https://api.slack.com/tutorials/slack-apps-hello-world

APP_NAME="Textedit.app"

 if [ $(ps ax | grep -v grep | grep $APP_NAME | wc -l) -eq 0 ]
    then
        echo "$APP_NAME not running yet or computer just rebooted. Opening..."
        AlertText="App Not Running $APP_NAME at $(date)"

curl -X POST -H 'Content-type: application/json' --data '{"text": "'"$AlertText"'", "color": "#9C1A22"}' YOUR_WEBHOOK_URL

#more complex attachment with more color coding - more info on formatting here: https://api.slack.com/docs/message-attachments

#curl -X POST -H 'Content-type: application/json' --data '{"attachments": [{"author_name": "Standard Alert", "text":"Problem with the app <!here>","color": "#9C1A22" }]}' YOUR_WEBHOOK_URL

        open /Applications/$APP_NAME
    else
        echo "$APP_NAME already running - will not open duplicate"
    fi
