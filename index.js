'use strict';

const os = require('os');
const express = require('express');
const swarmLib = require('./swarm-lib.js')();
const bodyParser = require('body-parser');
const log = require('./log.js');

var app = express();
var external = null;
var SERVICE = process.env.SERVICE;

if (!SERVICE){
    log.error('SERVICE environment variable is not set!');
    process.exit(1);
}

var routes_check = require('./routes/routes-check.js')(SERVICE);

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(routes_check);

swarmLib.getExternalInfos().then(function(_external) {
    external = _external;
}).catch(function(err) {
    log.error('could not cache local ip ' + err);
});

app.get('/', function(req, res) {
    swarmLib.getIPs(SERVICE).then(function(result) {
        res.send('Hello World!<br/>' +
            '<br/>Hostname:<pre>' + os.hostname() + '</pre>' +
            '<br/>Own Internal IP:<pre>' + result.ownInternalIP + '</pre>' +
            '<br/>Own External IP:<pre>' + external.ip + '</pre>' +
            '<br/>Country code:<pre>' + external.country + '</pre>' +
            '<br/>Own External hostnames:<pre>' + JSON.stringify(external.names, null, ' ') + '</pre>' +
            '<br/>Own IPs:<pre>' + JSON.stringify(result.ownIPs, null, ' ') + '</pre>' +
            '<br/>Found others:<pre>' + JSON.stringify(result.otherInternalIPs, null, ' ') + '</pre>');
    }).catch(function(err) {
        res.status(500).send(err);
    });
});

app.listen(80, function() {
    log.info('stream-check listening on port 80!');
});
