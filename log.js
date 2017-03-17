'use strict';

const colors = require('colors');
const util = require('util');

function decodeError(obj) {
    if (obj) {
        if (typeof obj === 'object') {
            return util.inspect(obj);
        }
    }
    return '' + obj;
}

function getTimeString(){
    return (new Date()).toISOString().white.italic;
}

function trace(msg) {
    msg = decodeError(msg);
    console.log(getTimeString() + ' ' + msg.grey);
}

function debug(msg) {
    msg = decodeError(msg);
    console.log(getTimeString() + ' ' + msg.white);
}

function info(msg) {
    msg = decodeError(msg);
    console.log(getTimeString() + ' ' + msg.green);
}

function warn(msg) {
    msg = decodeError(msg);
    console.log(getTimeString() + ' ' + msg.yellow);
}

function error(msg) {
    msg = decodeError(msg);
    console.log(getTimeString() + ' ' + msg.red);
}

module.exports = {
    trace: trace,
    debug: debug,
    info: info,
    warn: warn,
    error: error
};
