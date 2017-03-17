'use strict';

const parsers = require('playlist-parser');
const url = require('url');
const path = require('path');

var M3U = parsers.M3U;
var PLS = parsers.PLS;
var ASX = parsers.ASX;

function makeLinksAbsolute(link, content){
    var o = url.parse(link);
    var baseServer = o.protocol + '//' + o.host;
    var basePath = baseServer + path.dirname(o.pathname);

    for (var i=0;i<content.length;i++){
        var file = content[i].file.toLowerCase();
        if (file.indexOf('http://') < 0 && file.indexOf('https://') < 0){
            if (content[i].file[0] === '/'){
                content[i].file = baseServer + o.content[i].file;
            }else if (content[i].file[0] === ''){
                content[i].file = basePath + '/' + o.content[i].file;
            }
        }
    }
    return content;
}

function decode(link, content) {
    var playlist = null;
    if (content.toLowerCase().indexOf('[playlist]') >= 0) {
        return PLS.parse(content);
    } else if (content.toLowerCase().indexOf('<asx') >= 0) {
        return ASX.parse(content);
    } else {
        playlist = M3U.parse(content);
    }
    return makeLinksAbsolute(link, playlist);
}

module.exports = {
    decode: decode
};
