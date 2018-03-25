var fs = require('fs-extra');
var path = require('path');
var Q = require('q');
var _ = require('underscore');

var OUTPUT_DIR = '../../output';
var SONG_FILENAME = 'song-name.txt';
var ALBUM_FILENAME = 'album-name.txt';
var ALBUM_DATE_FILENAME = 'album-date.txt';
var PROGRESS_FILENAME = 'progress.txt';
var DEFAULT_VALUE = '';

var _getFilePath = function(filename) {
    return path.join(__dirname, OUTPUT_DIR, filename);
};

var _writeToFile = function(filename, commitWrite, data) {
    if(commitWrite) {
        return fs.outputFile(_getFilePath(filename), data || '');
    } else {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise;
    }
};

var writeSongFile = function(config, trackInfo) {
    var dataParts = [];
    if(trackInfo.name) { dataParts.push(trackInfo.name); }
    if(trackInfo.artists.length > 0) {
        // only grab non-empty artist names
        var artists = [];
        _.each(trackInfo.artists, function(artist) {
            if(artist.name && artist.name != '') {
                artists.push(artist);
            }
        })
        
        if(artists.length > 0) {
            dataParts.push(artists.join(', '));
        }
    }
    
    return _writeToFile(SONG_FILENAME, config.SAVE_TRACK, dataParts.join(' - '));
};

var writeAlbumFile = function(config, trackInfo) {
    var data = (trackInfo.album_name && trackInfo.album_name != '') ? trackInfo.album_name : DEFAULT_VALUE;
    return _writeToFile(ALBUM_FILENAME, config.SAVE_ALBUM, data);
};

var writeAlbumDateFile = function(config, trackInfo) {
    var data = (trackInfo.album_date && trackInfo.album_date != '') ? trackInfo.album_date : DEFAULT_VALUE;
    return _writeToFile(ALBUM_DATE_FILENAME, config.SAVE_ALBUM, data);
};

exports.writeSongFile = writeSongFile;
exports.writeAlbumFile = writeAlbumFile;
exports.writeAlbumDateFile = writeAlbumDateFile;
