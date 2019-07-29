var fs = require('fs-extra');
var path = require('path');
var Q = require('q');
var _ = require('underscore');

var log = require('./log');

var OUTPUT_DIR = 'output';
var SONG_FILENAME = 'song-name.txt';
var ALBUM_FILENAME = 'album-name.txt';
var ALBUM_DATE = 'album-date.txt';
var ALBUM_IMG_FILENAME = 'album-img.png';

var _getFilePath = function(filename) {
    return path.join(OUTPUT_DIR, filename);
};

var _writeToFile = function(filename, commitWrite, data, isBinary) {
    var deferred = Q.defer();
    
    var filepath = _getFilePath(filename);
    var write = function() {
        if(commitWrite) {
            if(data) {
                log.info('"{data}" -> "{file}"', {
                    data: !isBinary ? data : '<BinaryData>',
                    file: filepath
                });
                return fs.outputFile(filepath, data, isBinary ? 'binary' : undefined);
            } else {
                log.info('DELETE "{0}"', filepath);
                return fs.remove(filepath);
            }
        } else {
            deferred.resolve();
        }
    };
    
    write().then(function() {
        deferred.resolve();
    }, function(err) {
        log.error('Error writing to "{file}: {err}"', { file: filepath, err: err });
        deferred.resolve();
    });
    
    return deferred.promise;
};

// filter out redundancy in track/album names
var _filterRedundancy = function(val) {
    var removedParentheses = val.replace(/\s*\(.*?\)\s*/g, '');
    var removedBrackets = removedParentheses.replace(/\s*\[.*?\]\s*/g, '');
    return removedBrackets;
};

var writeSongFile = function(config, trackInfo) {
    var dataParts = [];
    
    if(trackInfo.name) {
        dataParts.push(_filterRedundancy(trackInfo.name));
    }
    
    if(trackInfo.artists.length > 0) {
        dataParts.push(trackInfo.artists.join(', '));
    }
    
    return _writeToFile(SONG_FILENAME, config.file.SAVE_TRACK_NAME, dataParts.join(' - '), false);
};

var writeAlbumFile = function(config, trackInfo) {
    var dataParts = [];
    
    if(trackInfo.album.name) {
        dataParts.push(_filterRedundancy(trackInfo.album.name));
    }
    
    return _writeToFile(ALBUM_FILENAME, config.file.SAVE_ALBUM_NAME, dataParts.join(' '), false);
};

var writeAlbumDate = function(config, trackInfo) {
    return _writeToFile(ALBUM_DATE, config.file.SAVE_ALBUM_DATE, trackInfo.album.date, false);
};

var writeAlbumImageFile = function(config, data) {
    return _writeToFile(ALBUM_IMG_FILENAME, config.file.SAVE_ALBUM_IMAGE, data, true);
};

exports.writeSongFile = writeSongFile;
exports.writeAlbumFile = writeAlbumFile;
exports.writeAlbumDate = writeAlbumDate;
exports.writeAlbumImageFile = writeAlbumImageFile;
