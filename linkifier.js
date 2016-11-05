/*
    Copyright (c) 2016 Unify Inc.

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
    OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

'use strict';
const Circuit = require('circuit');
const store = require('./store');
const bunyan = require('bunyan');
const log = require('./logger').log;


// Load configuration
const config = require('./config.json');

// Setup bunyan logger for SDK
Circuit.setLogger(bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: config.app.sdkLogLevel
}));

// Subscriptions hastable wiht userId as key. Values are the client object and the listener
let subscriptions = {};

function init() {
    // On startup subscribe for all users
    store.getUsers().forEach(userId => logon(userId).then(subscribe).catch(log.error));
}

// Check if user is authenticated
function isAuthenticated(userId) {
    return new Promise((resolve, reject) => {
        let client = subscriptions[userId] && subscriptions[userId].client;
        if (!client) {
            reject(userId);
            return;
        }
        return client.isAuthenticated().then(resolve);
    });
}

// User initially set, or changed linkify settings. Unsubscribe and subscribe again
function update(userId) {
    isAuthenticated(userId)
    .catch(() => { return logon(userId); })
    .then(() => {
        unsubscribe(userId);
        subscribe(userId);
    });
}

// Logout user
function logout(userId) {
    return new Promise(resolve => {
        let client = subscriptions[userId] && subscriptions[userId].client;
        if (client) {
            client.logout().then(resolve);
        } else {
            resolve();
        }
    });
}

// Logon using access token
function logon(userId) {
    return new Promise((resolve, reject) => {
        let token = store.getToken(userId);
        if (!token || !token.access_token) {
            reject('No token for user ' + userId);
            return;
        }
        let client = new Circuit.Client({domain: config.circuit.domain, client_id: config.circuit.client_id});
        client.logon({accessToken: token.access_token})
        .then(user => {
            subscriptions[user.userId] = {
                client: client
            }
            log.info(`Logged on user ${user.emailAddress}`);
            resolve(userId);
        });
    });
}

function subscribe(userId) {
    var onItemAdded = linkify.bind(null, userId);
    let client = subscriptions[userId].client;
    client.addEventListener('itemAdded', onItemAdded);
    subscriptions[userId].onItemAddedListener = onItemAdded;
}

function unsubscribe(userId) {
    let s = subscriptions[userId];
    if (s) {
        s.client.removeEventListener('itemAdded', s.onItemAddedListener);
        delete subscriptions[userId].onItemAddedListener;
    } 
}

function createUpdateItem(item, content) {
    return {
        itemId: item.itemId,
        contentType: item.text.contentType,
        content: content,
        attachmentMetaData: item.attachments,
        externalAttachmentMetaData: item.externalAttachments,
        preview: item.text.preview,
        voting: item.voting
    };
}

function linkify(userId, evt) {
    let setting = store.getSettings(userId);
    let client = subscriptions[userId].client;
    let item = evt.item;
    if (item && item.text && item.creatorId === client.loggedOnUser.userId) {
        let content = item.text.content;
        config.linkify.forEach(entry => {
            if (setting[entry.id]) {
                let regex = new RegExp('(^|\\s)' + entry.search, 'g');
                let replace = entry.replace.replace('$1', '$2');
                let match = '$2';
                content = content.replace(regex, `$1<a href="${replace}">${match}</a>`);
            }
        });
        if (content !== item.text.content) {
            let newItem = createUpdateItem(item, content);
            client.updateTextItem(newItem);
        }
    }
}

module.exports = {
    init,
    update
};
