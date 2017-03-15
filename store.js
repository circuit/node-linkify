/*
    Copyright (c) 2017 Unify Inc.

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
const jsonfile = require('jsonfile');
const fileExists = require('file-exists');
const log = require('./logger').log;

const DATA_FILE = './db/data.json';

jsonfile.spaces = 4;

let data;

function init() {
    !fileExists(DATA_FILE) && jsonfile.writeFileSync(DATA_FILE, {});
    data = jsonfile.readFileSync(DATA_FILE);
}

function getValues() {
    let keys = Object.keys(data);
    return keys.map(v => { return data[v]; });
}

function getUsers() {
    return Object.keys(data);
}

var saveSettings = save.bind(null, 'settings');
var saveToken = save.bind(null, 'token');
var getSettings = get.bind(null, 'settings');
var getToken = get.bind(null, 'token');

function save(key, userId, obj) {
    return new Promise((resolve, reject) => {
        data[userId] = data[userId] || {};
        data[userId][key] = obj;
        jsonfile.writeFile(DATA_FILE, data, err => err ? reject(err) : resolve());
    });
}

function get(key, userId) {
    return !!data[userId] && data[userId][key];
}

module.exports = {
    init,
    getUsers,
    getValues,
    saveToken,
    getToken,
    saveSettings,
    getSettings
};
