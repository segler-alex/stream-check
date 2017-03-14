'use strict';

const express = require('express');
const request = require('request-promise-native');
const httpDetail = require('../http-detail.js');
const swarmLib = require('../swarm-lib.js')();

var router = express.Router();

var localIp = null;
var external = null;
var serviceName = null;

function log(msg){
    console.log(msg);
}

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
    log('check:' + url);
    if (!url) {
        log('check empty url');
        res.status(400).json({
            ok: false
        });
    } else {
        log('check url ok:' + url);
        httpDetail.getHeaderRecursive(url, {
            debug: true
        }).then((data) => {
            log('check url finished:' + url);
            res.json({
                ok: true,
                self: localIp,
                selfExternal: external.ip,
                country: external.country,
                result: data
            });
        }).catch((err) => {
            log(err);
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
        log('11 could not cache local ip ' + err);
    });

    return router;
};
