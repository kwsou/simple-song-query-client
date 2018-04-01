var fs = require('fs-extra');
var path = require('path');
var Q = require('q');
var _ = require('underscore');

var log = require('./log');

var OUTPUT_DIR = 'output';
var SONG_FILENAME = 'song-name.txt';
var ALBUM_FILENAME = 'album-name.txt';
var ALBUM_IMG_FILENAME = 'album-img.png';

var _getFilePath = function(filename) {
    return path.join(OUTPUT_DIR, filename);
};

var _writeToFile = function(filename, commitWrite, data, writeOptions) {
    if(commitWrite) {
        var filepath = _getFilePath(filename);
        if(data) {
            log.info('(file-util._writeToFile) WRITE "' + filepath + '"');
            return fs.outputFile(filepath, data, writeOptions);
        } else {
            log.info('(file-util._writeToFile) DELETE "' + filepath + '"');
            return fs.remove(filepath);
        }
    } else {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise;
    }
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
    
    return _writeToFile(SONG_FILENAME, config.SAVE_TRACK, dataParts.join(' - '));
};

var writeAlbumFile = function(config, trackInfo) {
    var dataParts = [];
    
    if(trackInfo.album.name) {
        dataParts.push(_filterRedundancy(trackInfo.album.name));
    }
    
    if(trackInfo.album.date) {
        dataParts.push('[' + trackInfo.album.date + ']');
    }
    
    return _writeToFile(ALBUM_FILENAME, config.SAVE_ALBUM, dataParts.join(' '));
};

var writeAlbumImageFile = function(config, data) {
    return _writeToFile(ALBUM_IMG_FILENAME, config.SAVE_ALBUM_IMAGE, data, 'binary');
};

exports.writeSongFile = writeSongFile;
exports.writeAlbumFile = writeAlbumFile;
exports.writeAlbumImageFile = writeAlbumImageFile;
