var request = require('request');
var querystring = require('querystring');
var _ = require('underscore');
var Q = require('q');
var cmd = require('node-cmd');
var path = require('path');

var log = require('../log');
var checkConfig = require('../verify-config');
var fileUtil = require('../file-util');

var HTML_INDICATOR = '<!DOCTYPE html>';
var cache = {};

var perform = function(config) {
    var invalidKeys = checkConfig.verifySpotifyOperation(config);
    if(invalidKeys) { log.error(invalidKeys); return; }
    
    var tick = function() {
        _tick(config).then(function() {
            setTimeout(tick, config.UPDATE_TIME);
        }, function(err) {
            log.error('(spotify.perform.tick) ' + err);
        })
    }
    
    tick();
};

// gets invoked for every poll update
var _tick = function(config) {
    var deferred = Q.defer();
    var onError = function(err) { deferred.reject(err); };
    
    _retrieveSpotifyWindow(config).then(function(titleName) { 
        if(cache.titleName != titleName) {
            // a change in spotify has been detected (i.e. stop/resume track, new track, etc.)
            cache.titleName = titleName;
            
            _retrieveSongInfo(config).then(function(respBody) {
                // only obtain the values of interest
                var songInfo = JSON.parse(respBody);
                var trackInfo = {
                    name: '',
                    album_name: '',
                    album_date: '',
                    artists: []
                };
                
                if(songInfo.is_playing) {
                    trackInfo.name = songInfo.item.name || '',
                    trackInfo.album_name = songInfo.item.album.name || '',
                    trackInfo.album_date = songInfo.item.album.release_date || '',
                    
                    _.each(songInfo.item.artists, function(artist) {
                        trackInfo.artists.push(artist.name);
                    });
                }
                log.info('trackInfo: ' + JSON.stringify(trackInfo));
                
                var noOperation = function() { var d = Q.defer(); d.resolve(); return d.promise; };
                var writeToFileOperations = {
                    name: fileUtil.writeSongFile,
                    album_name: fileUtil.writeAlbumFile,
                    album_date: fileUtil.writeAlbumDateFile
                };
                
                var filePromises = [];
                _.each(writeToFileOperations, function(opCallback, key) {
                    if(cache[key] != trackInfo[key]) {
                        // update to file required
                        if(trackInfo[key] == '') {
                            log.info('(spotify._tick) no track found, flushing file ' + key);
                        } else {
                            log.info('(spotify._tick) new track found, updating file ' + key);
                        }
                        
                        cache[key] = trackInfo[key];
                        filePromises.push(opCallback(config, trackInfo));
                    } else {
                        filePromises.push(noOperation());
                    }
                });
                
                Q.allSettled(filePromises).then(function(results) {
                    _.each(results, function(promise) {
                        if(promise.state != 'fulfilled') {
                            log.error('(spotify._tick) writing to file - ' + promise.reason);
                        }
                    });
                    deferred.resolve();
                })
            }, onError);
        } else {
            // no change detected -- end poll and do nothing
            deferred.resolve();
        }
    }, onError);
    
    return deferred.promise;
};

// retrieves the current window title of spoitfy
var _retrieveSpotifyWindow = function(config) {
    var deferred = Q.defer();
    
    var shellPath = path.join(__dirname, '../..', '/shell/windows/retrieveSpotifyTitle.bat');
    cmd.get('"' + shellPath + '"', function(err, data, stderr) {
        if(err || !data || data == '' || data == 'N/A') {
            deferred.reject('Spotify process not running');
            return;
        }
        
        deferred.resolve(data);
    });
    
    return deferred.promise;
};

// makes a call to the server to retrieve current playing song
var _retrieveSongInfo = function(config) {
    var deferred = Q.defer();
    
    request.get({
        url: config.SPOTIFY_POLL_URL,
        qs: { username: config.SPOTIFY_USERNAME }
    }, function(error, response, body) {
        if(response && response.statusCode !== 200) {
            deferred.reject(error || body);
        }
        
        if(!body) {
            deferred.reject('Expected body for _retrieveSongInfo but got nothing instead');
        }
        
        // check if we need to authenticate user
        if(body.indexOf(HTML_INDICATOR) >= 0) {
            deferred.reject('Authenticate prompt received');
        }
        
        deferred.resolve(body);
    });
    
    return deferred.promise;
};

exports.perform = perform;
