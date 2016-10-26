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
const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const Session = require('express-session');
const request = require('request');
const randomstring = require('randomstring');
const OAuth2 = require('simple-oauth2');

const linkifier = require('./linkifier');
const store = require('./store');

// Load configuration
const config = require('./config.json');

//process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Init storage
store.init();

// Initialize linkifier
linkifier.init(config.circuit.domain);

// simple-oauth2 configuration
const oauth2 = OAuth2.create({
  client: {
    id: config.circuit.client_id,
    secret: config.circuit.client_secret
  },
  auth: {
    tokenHost: `https://${config.circuit.domain}`
  }
});

// OAuth2 redirect uri
let portInUrl = config.app.includePortInRedirectURL ? `:${config.app.port}` : '';
const redirectUri = `${config.app.domain}${portInUrl}/oauthCallback`

// Create app
var app = express();

// Configure view engine, render EJS templates and serve static assets
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

// Setup express session. No store used in this example.
app.use(Session({
    secret: 'secret-5492',
    resave: true,
    saveUninitialized: true
}));

// Middleware to ensure user is authenticated
function auth(req, res, next) {
  req.session.isAuthenticated ? next() : res.redirect('/');
}

// Routes
app.get('/', (req, res) => {
    if (req.session.isAuthenticated) {
        // Read settings and show currently active linkifiers
        config.linkify.forEach(item => {
            let settings = store.getSettings(req.session.userId);
            item.active = settings && !!settings[item.id];
        });
    } 
    res.render('manage', {
        domain: config.circuit.domain,
        data: config.linkify,
        authenticated: req.session.isAuthenticated,
        displayName: req.session.displayName
    });
});

app.get('/login', (req, res) => {
    // Create state parameter to prevent CSRF attacks. Save in session.
    req.session.oauthState = randomstring.generate(12);
    
    // Redirect to OAuth2 authorize url
    let url = oauth2.authorizationCode.authorizeURL({
        redirect_uri: redirectUri,
        scope: config.circuit.scope,
        state: req.session.oauthState
    });
    res.redirect(url);
});

app.get('/logout', (req, res) => {
    req.session.isAuthenticated = false;
    res.redirect('/');
});

app.get('/oauthCallback', (req, res) => {
    // Verify code is present and state matches to prevent CSRF attacks
    if (req.query.code && req.session.oauthState === req.query.state) {
        // Get the access token using the code
        oauth2.authorizationCode.getToken({
            code: req.query.code,
            redirect_uri: redirectUri
        })
        .then(result => {
            // Save access token in session
            if (result.error) {
                Promise.reject(result.error_description);
                return;
            }
            return oauth2.accessToken.create(result).token;
        })
        .then(token => {
            req.session.isAuthenticated = true;
            // Get the userId & displayName and store in session
            request.get(`https://${config.circuit.domain}/rest/v2/users/profile`, {
                'auth': { 'bearer': token.access_token }
            }, (err, httpResponse, body) => {
                if (err) {
                    Promise.reject(err);
                }
                let user = JSON.parse(body);
                req.session.userId = user.userId;
                req.session.displayName = user.displayName;
                store.saveToken(user.userId, token);
                res.redirect('/');
            });
        })
        .catch(err => {
            console.log(err);
            res.render('error', {error: err});
        });
    } else {
        // Access denied
        res.render('error', {error: 'Access Denied'});
    }
});

app.post('/activate', urlencodedParser, auth, (req, res) => {
    // Save the new settings
    store.saveSettings(req.session.userId, req.body)
    .then(settings => linkifier.update(req.session.userId))
    .then(() => res.redirect('/success'))
    .catch(console.error);
});

app.get('/success', auth, (req, res) => {
    // Show success message
    res.render('success', {domain: config.circuit.domain});
});

// Start app
var server = http.createServer(app);

/* For https
var server = https.createServer({
  key: fs.readFileSync('cert/server.key'),
  cert: fs.readFileSync('cert/server-cert.pem')
}, app); */

server.listen(config.app.port);
server.on('listening', () => console.log(`listening on ${config.app.port}`));