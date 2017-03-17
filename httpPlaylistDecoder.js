'use strict';

const httpDetail = require('./http-detail.js');
const playlistDecoder = require('./playlistDecoder.js');
const log = require('./log.js');

function isContentTypePlaylistM3U(contentType) {
    contentType = contentType.toLowerCase();

    var types = [
        'application/mpegurl',
        'application/x-mpegurl',
        'audio/mpegurl',
        'audio/x-mpegurl',
        'application/vnd.apple.mpegurl',
        'application/vnd.apple.mpegurl.audio'
    ];

    return types.indexOf(contentType) >= 0;
}

function isContentTypePlaylistPLS(contentType) {
    contentType = contentType.toLowerCase();

    var types = [
        'audio/x-scpls',
        'application/x-scpls',
        'application/pls+xml'
    ];

    return types.indexOf(contentType) >= 0;
}

function isContentTypePlaylistASX(contentType) {
    contentType = contentType.toLowerCase();

    var types = [
        'video/x-ms-asf',
        'video/x-ms-asx'
    ];

    return types.indexOf(contentType) >= 0;
}

// function isContentHLS(content) {
//     // replace different kinds of newline with the default
//     content = str_replace(array("\r\n", "\n\r", "\r"), "\n", content);
//     $lines = explode("\n", content);
//
//     foreach($lines as $line) {
//         if (strrpos($line, "EXT-X-STREAM-INF") !== false) {
//             return true;
//         }
//         if (strrpos($line, "EXT-X-TARGETDURATION") !== false) {
//             return true;
//         }
//     }
//     return false;
// }

function isContentTypePlaylist(contentType) {
    if (isContentTypePlaylistM3U(contentType)) {
        return true;
    }
    if (isContentTypePlaylistPLS(contentType)) {
        return true;
    }
    if (isContentTypePlaylistASX(contentType)) {
        return true;
    }
    return false;
}

function getStreamType(contentType) {
    var codec = null;
    if (contentType === 'audio/mpeg' || contentType === 'audio/mp3') {
        codec = 'MP3';
    } else if (contentType === 'audio/aac') {
        codec = 'AAC';
    } else if (contentType === 'audio/x-aac') {
        codec = 'AAC';
    } else if (contentType === 'audio/aacp') {
        codec = 'AAC+';
    } else if (contentType === 'audio/ogg') {
        codec = 'OGG';
    } else if (contentType === 'application/ogg') {
        codec = 'OGG';
    } else if (contentType === 'audio/flac') {
        codec = 'FLAC';
    } else if (contentType === 'application/flv') {
        codec = 'FLV';
    } else if (contentType === 'application/octet-stream') {
        codec = 'UNKNOWN';
    }
    return codec;
}

function headercheck(result) {
    var contentType = result.headers['content-type'];
    return isContentTypePlaylist(contentType);
}

function decode(link) {
    return httpDetail.getHeader(link, {
        headercheck: headercheck,
        contentsize: 10 * 1000
    }).then((result) => {
        log.debug(result);
        if (result.headers.location) {
            // redirect
            log.info('redirect to:'+result.headers.location);
            return httpDetail.getHeader(result.headers.location);
        } else if (headercheck(result)) {
            // playlist
            log.info('playlist at:'+link);
            var playlistString = result.content.toString('ascii');
            log.trace(playlistString);

            var playlist = playlistDecoder.decode(link, playlistString);

            log.warn(playlist);

            return Promise.all(playlist.map((item) => {
                return decode(item.file);
            })).then((items)=>{
                var list = [];
                for (var i=0;i<items.length;i++){
                    if (Array.isArray(items[i])){
                        items = items.concat(items[i]);
                    }else{
                        list.push(items[i]);
                    }
                }
                return list;
            });
        } else {
            var codec = getStreamType(result.headers['content-type']);
            if (codec) {
                // stream
                log.info('stream at:'+link);
                var bitrate = parseInt(result.headers['icy-br']) || 0;
                if (bitrate > 10000){
                    bitrate = bitrate / 1000;
                }
                var genre = result.headers['icy-genre'];
                var genres = [];
                if (genre){
                    if (genre.indexOf(',') >= 0){
                        genres = genre.split(',').map((item)=>{return item.trim();});
                    }else{
                        genres = genre.split(' ').map((item)=>{return item.trim();});
                    }
                }
                return {
                    url: link,
                    name: result.headers['icy-name'],
                    genres: genres,
                    homepage: result.headers['icy-url'],
                    bitrate: bitrate,
                    sampling: parseInt(result.headers['icy-sr'] || '0') || 0,
                    description: result.headers['icy-description'],
                    audio: result.headers['ice-audio-info']
                };
            } else {
                // something we don't know
                log.warn('unknown at:'+link);
            }
        }
    }).catch((err) => {
        log.error(err);
    });
}

module.exports = {
    decode: decode
};
