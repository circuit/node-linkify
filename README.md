# node-linkify

This node.js web server application parses the text messages sent by the user and converts predefined text with links. The predefined text and its replacement link are configurable for the app.

* node.js web server application using EJS server-side templating for users to active Linkify
* Circuit REST API OAuth2 to authentication and authorize the user (Authorization Grant Flow)
* Circuit node.js SDK to logon on behalf of the user, subscribe to text messages and update a text messages

Your post:

<img src="public/before.jpg" width="600px">

Updated by Circuit Linkify on your behalf:

<img src="public/after.jpg" width="600px">


## Requirements
* [node 4.x](http://nodejs.org/download/)
* [circuit module](https://circuitsandbox.net/sdk/)

## Getting Started

```bash
    git clone https://github.com/yourcircuit/node-linkify.git
    cd node-linkify
    cp config.json.template config.json
```

Edit config.json
* Configure the circuit domain (e.g. circuitsandbox.net)
* Add OAuth2 settings (client_id, client_secret, scope)
* Configure the applications domain and port
* Configure the linkify regex

```bash
{
    "circuit": {
        "domain": "circuitsandbox.net",
        "client_id": "bee562d3d6a947efa04438a996f34c80",
        "client_secret": "37c8cb081cd64764ba26cdbaf9bee00a",
        "scope": "READ_USER_PROFILE,READ_CONVERSATIONS"
    },
    "app": {
        "domain": "http://localhost",
        "port": 7100,
        "sdkLogLevel": "debug"
    },
    "linkify": [{
        "title": "Jira (ANS, AAC and CRI links)",
        "id": "jira",
        "search": "(ANS-[0-9]{1,5}|AAC-[0-9]{1,5}|CRI-[0-9]{1,5})",
        "replace": "https://jira.dev.global-intra.net:8443/browse/$1"
    },
    {
        "title": "Gerrit (patch number)",
        "id": "gerrit",
        "search": "([4-6][0-9]{4})",
        "replace": "https://gitsrv1.dev.global-intra.net/#/c/$1"
    }]
}
``` 
 
Run the sample application with 
 
```bash
    npm install
    wget https://circuitsandbox.net/circuit.tgz
    npm install circuit.tgz
    node index.js
``` 

 If you do not have wget installed you can use curl to download circuit.tgz
```bash
curl "https://circuitsandbox.net/circuit.tgz" -o "circuit.tgz"
``` 

