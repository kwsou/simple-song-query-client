var _ = require('underscore');
var Q = require('q');
var cmd = require('node-cmd');
var path = require('path');

var log = require('../log');
var checkConfig = require('../verify-config');
var fileUtil = require('../file-util');
var dispatcher = require('../dispatcher');

var HTML_INDICATOR = '<!DOCTYPE html>';
var perm_cache = {};

var perform = function(config) {
    var tick = function() {
        _tick(config).then(function() {
            setTimeout(tick, config.poll.UPDATE_TIME);
        }, function(err) {
            log.error(err);
        })
    }
    
    tick();
};

// gets invoked for every poll update
var _tick = function(config) {
    var deferred = Q.defer();
    var onError = function(err) { deferred.reject(err); };
    
    _retrieveSpotifyWindow(config).then(function(titleName) { 
        if(perm_cache.titleName == titleName) {
            // no change detected -- end poll and do nothing
            deferred.resolve();
            return deferred.promise;
        }
        
        perm_cache.titleName = titleName;
        _retrieveSongInfo(config).then(function(trackInfo) {
            var noOperation = function() { var d = Q.defer(); d.resolve(); return d.promise; };
            var writeToFileOperations = {
                name: {
                    cacheValue: trackInfo.name,
                    writeOperation: fileUtil.writeSongFile
                },
                album_name: {
                    cacheValue: trackInfo.album.name,
                    writeOperation: fileUtil.writeAlbumFile
                },
                album_img: {
                    cacheValue: trackInfo.album.image_urls.toString(),
                    writeOperation: function(config, trackInfo) {
                        var writeImageDeferred = Q.defer();
                        _retrieveAlbumImage(config, trackInfo.album.image_urls).then(function(data) {
                            fileUtil.writeAlbumImageFile(config, data).then(function() {
                                writeImageDeferred.resolve();
                            })
                        });
                        return writeImageDeferred.promise;
                    }
                }
            };
            
            var filePromises = [];
            _.each(writeToFileOperations, function(v, k) {
                if(!_.has(perm_cache, k) || perm_cache[k] != v.cacheValue) {
                    // update to file required
                    perm_cache[k] = v.cacheValue;
                    filePromises.push(v.writeOperation(config, trackInfo));
                } else {
                    filePromises.push(noOperation());
                }
            });
            
            Q.allSettled(filePromises).then(function(results) {
                _.each(results, function(promise) {
                    if(promise.state != 'fulfilled') {
                        log.error(promise.reason);
                    }
                });
                deferred.resolve();
            })
        }, function(err) {
            deferred.reject(err);
        });
        
    });
    
    return deferred.promise;
};

// retrieves the current window title of spoitfy
var _retrieveSpotifyWindow = function(config) {
    var deferred = Q.defer();
    
    var shellPath = '"shell/windows/retrieveSpotifyTitle.bat"';
    // use absolute path if not running from executable
    if(!process.pkg) {
        shellPath = path.join(__dirname, '../..', shellPath);
    }
    
    cmd.get(shellPath, function(err, data, stderr) {
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
    
    dispatcher.send({
        method: 'GET',
        url: config.spotify.POLL_URL,
        qs: { username: config.spotify.USERNAME },
        expectBody: true
    }).then(function(body) {
        if(body.indexOf(HTML_INDICATOR) >= 0) {
            deferred.reject('Spotify authentication prompt received');
            return;
        }
        
        deferred.resolve(JSON.parse(body));
    }, function(payload) {
        // silently error out
        perm_cache = {};
        deferred.resolve({
            name: null,
            artists: [],
            album: {
                name: null,
                date: null,
                image_urls: []
            }
        });
    });
    
    return deferred.promise;
};

// makes a call to retrieve album image
var _retrieveAlbumImage = function(config, urls) {
    var deferred = Q.defer();
    
    var attemptRequest = function(currIndex) {
        if(currIndex < urls.length) {
            dispatcher.send({
                method: 'GET',
                url: urls[currIndex],
                encoding: null,
                expectBody: true
            }).then(function(data) {
                deferred.resolve(data);
            }, function(payload) {
                // try another url
                attemptRequest(currIndex + 1);
            });
        } else {
            // all attempts have failed so just return nothing
            deferred.resolve(null);
        }
    };
    attemptRequest(0);
    
    return deferred.promise;
};

exports.perform = perform;
