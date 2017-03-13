'use strict';

const dns = require('dns');
const os = require('os');
const bluebird = require('bluebird');
const moira = require('moira');
const geoip = require('geoip-lite');

var lookup = bluebird.promisify(dns.lookup);
var reverse = bluebird.promisify(dns.reverse);

function getOwnIps() {
    var ownIPs = [];
    var ifs = os.networkInterfaces();
    for (var item in ifs) {
        var addresses = ifs[item];
        for (var i = 0; i < addresses.length; i++) {
            if (!addresses[i].internal && addresses[i].family === 'IPv4') {
                ownIPs.push(addresses[i].address);
            }
        }
    }
    ownIPs.sort();
    return ownIPs;
}

function getIPs(serviceName) {
    if (!serviceName) {
        return Promise.reject(new Error('serviceName parameter missing'));
    }
    var ownIPs = getOwnIps();
    var dnsOptions = {
        all: true
    };
    var serviceNameDns = 'tasks.' + serviceName;
    return lookup(serviceNameDns, dnsOptions).then(function(addresses) {
        var self = null;
        var others = [];
        var all = [];
        for (var i = 0; i < addresses.length; i++) {
            var address = addresses[i].address;
            all.push(address);
            if (ownIPs.indexOf(address) < 0) {
                others.push(address);
            } else {
                self = address;
            }
        }
        others.sort();
        return {
            ownInternalIP: self,
            ownIPs: ownIPs,
            allInternalIPs: all,
            otherInternalIPs: others
        };
    });
}

function getExternalInfos() {
    console.log("getExternalInfos()");
    var infos = null;
    return new Promise((resolve, reject) => {
        moira.getIP(function(err, ip, service) {
            if (err) {
                reject(err);
            } else {
                var geo = geoip.lookup(ip);
                resolve({
                    ip: ip,
                    country: geo.country
                });
            }
        });
    }).then((_infos) => {
        infos = _infos;
        return reverse(infos.ip).catch((err) => {
            console.log('ignore reverse lookup error');
        });
    }).then((_names) => {
        infos.names = _names || [];
        return infos;
    });
}

var externalPromise = null;
var externalLastCheckTime = 0;

var servicePromise = {};
var serviceLastCheckTime = {};

module.exports = function() {
    function getExternalInfosCached() {
        var currentTime = process.uptime();
        if (currentTime > externalLastCheckTime + 60) {
            externalLastCheckTime = process.uptime();
            externalPromise = null;
        }
        if (!externalPromise) {
            externalPromise = getExternalInfos();
        }
        return externalPromise;
    }

    function getIPsCached(serviceName){
        var currentTime = process.uptime();
        if (!serviceLastCheckTime[serviceName]){
            serviceLastCheckTime[serviceName] = 0;
        }
        if (currentTime > serviceLastCheckTime[serviceName] + 5) {
            serviceLastCheckTime[serviceName] = process.uptime();
            servicePromise[serviceName] = null;
        }
        if (!servicePromise[serviceName]) {
            servicePromise[serviceName] = getIPs(serviceName);
        }
        return servicePromise[serviceName];
    }

    return {
        'getIPs': getIPsCached,
        'getExternalInfos': getExternalInfosCached
    };
};
