'use strict';

const express = require('express');
const xml = require('xml');
const request = require('request-promise-native');
const httpDetail = require('../http-detail.js');
const swarmLib = require('../swarm-lib.js')();

var router = express.Router();

var localIp = null;
var external = null;
var serviceName = null;

router.post('/checkall', function(req, res) {
    var url = req.body.url;
    var result;
    swarmLib.getIPs(serviceName).then(function(_result) {
        result = _result;
        var list = [];
        for (var i = 0; i < result.allInternalIPs.length; i++) {
            list.push(request.post({
                url: 'http://' + result.allInternalIPs[i] + ':3000/check',
                json: {
                    url: url
                }
            }));
        }
        return Promise.all(list);
    }).then((data) => {
        res.json({
            ok: true,
            self: localIp,
            data: data
        });
    }).catch((err) => {
        res.status(400).send({
            ok: false,
            url: url,
            result: result,
            err: err
        });
    });
});

router.post('/check', function(req, res) {
    var url = req.body.url;
    console.log('check:' + url);
    if (!url) {
        console.log('check empty url');
        res.status(400).json({
            ok: false
        });
    } else {
        console.log('check url ok:' + url);
        httpDetail.getHeaderRecursive(url, {
            debug: true
        }).then((data) => {
            console.log('check url finished:' + url);
            res.json({
                ok: true,
                self: localIp,
                selfExternal: external.ip,
                country: external.country,
                result: data
            });
        }).catch((err) => {
            console.error(err);
            res.status(403).json({
                ok: false
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
        console.error('11 could not cache local ip ' + err);
    });

    return router;
};
