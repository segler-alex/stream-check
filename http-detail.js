'use strict';

const net = require('net');
const tls = require('tls');
const url = require('url');

function decode(buffer) {
    var found = buffer.indexOf(Buffer.from([13, 10, 13, 10]));
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
        for (var i = 1; i < lines.length; i++) {
            var line = lines[i];
            var index = line.indexOf(':');
            if (index < 0) {
                result.headers[line] = '';
            } else {
                result.headers[line.substr(0, index)] = line.substr(index + 1);
            }
        }
        return result;
    }
    return null;
}

function getHeader(u, _options) {
    console.log('getHeader:'+u);
    var options = _options || {};
    var debug = options.debug || false;
    return new Promise(function(resolve, reject) {
        var parsed = url.parse(u);
        var buffer = Buffer.alloc(0);
        var resolved = false;
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            var port = null;
            var connect = null;
            if (parsed.protocol === 'http:'){
                connect = net.connect;
                port = parsed.port || 80;
            }else if (parsed.protocol === 'https:'){
                connect = tls.connect;
                port = parsed.port || 443;
            }
            var client = connect(port, parsed.hostname, function() {
                var requestStr = 'GET ' + parsed.path + ' HTTP/1.1\n' +
                    'Host: ' + parsed.hostname + '\n\n';
                client.write(requestStr);
                if (debug) {
                    console.log('connected:\n' + requestStr);
                }
            });
            client.on('data', (data) => {
                if (debug) {
                    console.log('connection data length:' + data.length);
                }
                buffer = Buffer.concat([buffer, data]);
                var decoded = decode(buffer);
                if (decoded) {
                    client.destroy();
                    if (!resolved) {
                        resolve(decoded);
                        resolved = true;
                    }
                }
            });
            client.on('end', () => {
                if (debug) {
                    console.log('connection ended');
                }
                if (!resolved) {
                    var decoded = decode(buffer);
                    if (decoded) {
                        resolve(decoded);
                    } else {
                        reject('decoding did not work:' + buffer.toString('ascii', 0, 10));
                    }
                    resolved = true;
                }
            });
            client.on('secureConnect',()=>{
                console.log('Secure connection established.');
            });
            client.on('error', (err) => {
                if (debug) {
                    console.log('err:' + err);
                }
                reject(err);
            });
        } else {
            reject('unknown protocol:' + parsed.protocol);
        }
    });
}

function getHeaderRecursive(url) {
    return getHeader(url).then((header) => {
        if (header.headers.Location) {
            return getHeaderRecursive(header.headers.Location);
        } else {
            return header;
        }
    });
}

module.exports = {
    getHeader: getHeader,
    getHeaderRecursive: getHeaderRecursive
};
