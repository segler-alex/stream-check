'use strict';

const express = require('express');
const request = require('request-promise-native');
const httpPlaylistDecoder = require('../httpPlaylistDecoder.js');
const swarmLib = require('../swarm-lib.js')();
const log = require('../log.js');

var router = express.Router();

var localIp = null;
var external = null;
var serviceName = null;

router.post('/status', function(req, res) {
    res.json({
        ok: true
    });
});

router.post('/checkall', function(req, res) {
    var url = req.body.url;
    var result;
    swarmLib.getIPs(serviceName).then(function(_result) {
        result = _result;
        var list = [];
        for (var i = 0; i < result.allInternalIPs.length; i++) {
            list.push(request.post({
                url: 'http://' + result.allInternalIPs[i] + '/check',
                json: {
                    url: url
                }
            }));
        }
        return Promise.all(list);
    }).then((data) => {
        res.json({
            self: localIp,
            data: data
        });
    }).catch((err) => {
        res.status(400).send({
            url: url,
            result: result,
            err: err
        });
    });
});

router.post('/check', function(req, res) {
    var url = req.body.url;
    log.debug('check:' + url);
    if (!url) {
        log.debug('check empty url');
        res.status(400).json({
            msg: 'check empty url'
        });
    } else {
        log.debug('check url ok:' + url);
        httpPlaylistDecoder.decode(url).then((data) => {
            log.debug('check url finished:' + url);
            res.json({
                self: localIp,
                selfExternal: external.ip,
                country: external.country,
                streams: data
            });
        }).catch((err) => {
            log.error(err);
            res.json({
                self: localIp,
                selfExternal: external.ip,
                country: external.country,
                streams: []
            });
        });
    }
});

module.exports = function(_servicename) {
    serviceName = _servicename;

    swarmLib.getExternalInfos().then(function(_external) {
        external = _external;
        return swarmLib.getIPs(serviceName);
    }).then((result) => {
        localIp = result.ownInternalIP;
    }).catch(function(err) {
        log.error('11 could not cache local ip ' + err);
    });

    return router;
};
