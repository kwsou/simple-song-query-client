var fs = require('fs-extra');
var path = require('path');
var Q = require('q');
var _ = require('underscore');

var log = require('./log');

var OUTPUT_DIR = '../../output';
var SONG_FILENAME = 'song-name.txt';
var ALBUM_FILENAME = 'album-name.txt';
var ALBUM_IMG_FILENAME = 'album-img.png';

var _getFilePath = function(filename) {
    return path.join(__dirname, OUTPUT_DIR, filename);
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

var writeSongFile = function(config, trackInfo) {
    var dataParts = [];
    
    if(trackInfo.name) {
        var raw = trackInfo.name;
        var removedParentheses = raw.replace(/\s*\(.*?\)\s*/g, '');
        var removedBrackets = removedParentheses.replace(/\s*\[.*?\]\s*/g, '');
        dataParts.push(removedBrackets);
    }
    
    if(trackInfo.artists.length > 0) {
        dataParts.push(trackInfo.artists.join(', '));
    }
    
    return _writeToFile(SONG_FILENAME, config.SAVE_TRACK, dataParts.join(' - '));
};

var writeAlbumFile = function(config, trackInfo) {
    var dataParts = [];
    
    if(trackInfo.album_name) {
        var raw = trackInfo.album_name;
        var removedParentheses = raw.replace(/\s*\(.*?\)\s*/g, '');
        var removedBrackets = removedParentheses.replace(/\s*\[.*?\]\s*/g, '');
        dataParts.push(removedBrackets);
    }
    
    if(trackInfo.album_date) {
        dataParts.push('[' + trackInfo.album_date + ']');
    }
    
    return _writeToFile(ALBUM_FILENAME, config.SAVE_ALBUM, dataParts.length > 0 ? dataParts.join(' ') : null);
};

var writeAlbumImageFile = function(config, data) {
    return _writeToFile(ALBUM_IMG_FILENAME, config.SAVE_ALBUM_IMAGE, data, 'binary');
};

exports.writeSongFile = writeSongFile;
exports.writeAlbumFile = writeAlbumFile;
exports.writeAlbumImageFile = writeAlbumImageFile;
