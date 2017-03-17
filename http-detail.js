'use strict';

const net = require('net');
const tls = require('tls');
const url = require('url');
const log = require('./log.js');

function decode(buffer) {
    var marker = Buffer.from([13, 10, 13, 10]);
    var found = buffer.indexOf(marker);
    if (found >= 0) {
        var result = {};
        var singleStr = buffer.toString('ascii', 0, found);

        var lines = singleStr.split('\r\n');
        if (lines.length <= 0) {
            return null;
        }
        var firstLine = lines[0].split(' ', 3);
        if (firstLine.length !== 3) {
            return null;
        }
        result.protocol = firstLine[0];
        result.statusCode = parseInt(firstLine[1]);
        result.status = firstLine[2];
        result.headers = {};
        result.content = Buffer.allocUnsafe(buffer.length - found - marker.length);
        log.debug('found marker at:'+found);
        log.debug('new buffer length:'+result.content.length);
        buffer.copy(result.content, 0, found + marker.length, buffer.length);
        for (var i = 1; i < lines.length; i++) {
            var line = lines[i];
            var index = line.indexOf(':');
            if (index < 0) {
                result.headers[line.toLowerCase()] = '';
            } else {
                result.headers[line.substr(0, index).toLowerCase()] = line.substr(index + 1).trim();
            }
        }
        return result;
    }
    return null;
}

function getHeader(u, _options) {
    log.debug('getHeader:' + u);
    var options = _options || {};
    var contentsize = options.contentsize || 1000;
    var checkedWithUser = false;
    var userWantsData = false;
    var decoded = null;

    return new Promise(function(resolve, reject) {
        var parsed = url.parse(u);
        var buffer = Buffer.alloc(0);
        var resolved = false;

        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            var port = null;
            var connect = null;
            if (parsed.protocol === 'http:') {
                connect = net.connect;
                port = parsed.port || 80;
            } else if (parsed.protocol === 'https:') {
                connect = tls.connect;
                port = parsed.port || 443;
            }
            var client = connect(port, parsed.hostname, function() {
                log.debug('Connected to '+parsed.hostname+':'+port);
                client.setNoDelay(true);
                var requestStr = 'GET ' + parsed.path + ' HTTP/1.1\r\n' +
                    'Host: ' + parsed.hostname + '\r\n' +
                    'User-Agent: RadioBrowser/1.0\r\n' +
                    'Connection: close\r\n' +
                    'Accept: */*\r\n\r\n';
                client.write(requestStr,'ascii');
                // client.write(Buffer.from([13,10,13,10]));
                log.debug('Sent to server:\n' + requestStr);
            });
            client.on('data', (data) => {
                log.debug('connection data length:' + data.length);
                buffer = Buffer.concat([buffer, data]);
                if (!decoded){
                    decoded = decode(buffer);
                    if (decoded) {
                        if (!checkedWithUser && options.headercheck) {
                            checkedWithUser = true;
                            userWantsData = options.headercheck(decoded);
                        }
                        if (!userWantsData || decoded.content.length > contentsize) {
                            client.destroy();
                            if (!resolved) {
                                resolve(decoded);
                                resolved = true;
                            }
                        }
                    }
                } else {
                    decoded.content = Buffer.concat([decoded.content, data]);
                }
            });
            client.on('end', () => {
                log.debug('connection ended');
                if (!resolved) {
                    if (!decoded){
                        decoded = decode(buffer);
                    }
                    if (decoded) {
                        resolve(decoded);
                    } else {
                        reject('decoding did not work:' + buffer.toString('ascii', 0, 10));
                    }
                    resolved = true;
                }
            });
            client.on('secureConnect', () => {
                log.debug('Secure connection established.');
            });
            client.on('error', (err) => {
                log.error('err:' + err);
                reject(err);
            });
        } else {
            reject('unknown protocol:' + parsed.protocol);
        }
    });
}

function getHeaderRecursive(url) {
    return getHeader(url).then((header) => {
        if (header.headers.location) {
            return getHeaderRecursive(header.headers.location);
        } else {
            return header;
        }
    });
}

module.exports = {
    getHeader: getHeader,
    getHeaderRecursive: getHeaderRecursive
};
