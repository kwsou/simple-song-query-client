var request = require('request');
var querystring = require('querystring');
var _ = require('underscore');
var Q = require('q');
var cmd = require('node-cmd');
var path = require('path');
var lruCache = require('lru-cache');

var log = require('../log');
var checkConfig = require('../verify-config');
var fileUtil = require('../file-util');

var HTML_INDICATOR = '<!DOCTYPE html>';
var perm_cache = {};
var ext_url_cache = lruCache({ max: 200, maxAge: 1000 * 60 * 60 * 10 });

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
    
    // only obtain the values of interest
    var processTrackInfo = function(spotifyResp) {
        var initDeferred = Q.defer();
        var songInfo = JSON.parse(spotifyResp);
        var trackInfo = {
            name: null,
            album_name: null,
            album_date: null,
            album_img: null,
            artists: []
        };
        
        if(!songInfo.is_playing) {
            initDeferred.resolve(trackInfo);
            return initDeferred.promise;
        }
        
        trackInfo.name = songInfo.item.name;
        trackInfo.album_name = songInfo.item.album.name;
        trackInfo.album_date = songInfo.item.album.release_date;
        
        // attempt to grab suitable album name if none present
        if(!trackInfo.album_name || trackInfo.album_name == '') {
            var regexPatterns = [
                /\(.*?\)/g,  // anything inside parentheses
                /\[.*?\]/g,  // anything inside brackets
                /\-.*?\-/g   // anything inside hyphens
            ];
            
            for(var i = 0; i < regexPatterns.length; i++) {
                var m = trackInfo.name.match(regexPatterns[i]);
                if(m) {
                    trackInfo.album_name = m.pop().slice(1, -1);
                    break;
                }
            }
        }
        
        // only grab non-empty artist names
        _.each(songInfo.item.artists, function(artist) {
            if(artist.name && artist.name != '') {
                trackInfo.artists.push(artist.name);
            }
        });
        
        if(songInfo.item.album.images.length > 0) {
            trackInfo.album_img = songInfo.item.album.images[0].url;
            initDeferred.resolve(trackInfo);
            return initDeferred.promise;
        }
        
        // otherwise, we attempt to grab a suitable image from google
        // but first, determine search term based on available information
        var searchTerms;
        if(trackInfo.album_name) {
            if(trackInfo.artists.length > 0) {
                searchTerms = [trackInfo.album_name].concat(trackInfo.artists);
            } else {
                searchTerms = [trackInfo.album_name, trackInfo.name];
            }
        } else {
            searchTerms = [trackInfo.name].concat(trackInfo.artists);
        }
        var searchTerm = searchTerms.join(' ');
        
        // next, check if we had previously found a suitable image
        if(ext_url_cache.has(searchTerm)) {
            trackInfo.album_img = ext_url_cache.get(searchTerm);
            initDeferred.resolve(trackInfo);
            return initDeferred.promise;
        }
        
        _retrieveGoogleImageSearch(config, searchTerm).then(function(resp) {
            var respBody = JSON.parse(resp);
            
            if(respBody.items && respBody.items.length > 0 && respBody.items[0].link) {
                trackInfo.album_img = respBody.items[0].link;
                // save to lru cache for next time potentially
                ext_url_cache.set(searchTerm, trackInfo.album_img);
                initDeferred.resolve(trackInfo);
            } else {
                // log the error but silently stop
                log.error('(spotify._tick) No suitable images found for "' + searchTerm + '"');
                initDeferred.resolve(trackInfo);
            }
        }, function(err) {
            // log the error but silently stop
            log.error('(spotify._tick) google api - ' + err);
            initDeferred.resolve(trackInfo);
        });
        
        return initDeferred.promise;
    };
    
    _retrieveSpotifyWindow(config).then(function(titleName) { 
        if(perm_cache.titleName != titleName) {
            // a change in spotify has been detected (i.e. stop/resume track, new track, etc.)
            perm_cache.titleName = titleName;
            
            _retrieveSongInfo(config).then(function(resp) {
                processTrackInfo(resp).then(function(trackInfo) {
                    log.info('(spotify._tick) NEW TRACK: ' + JSON.stringify(trackInfo));
                    
                    var noOperation = function() { var d = Q.defer(); d.resolve(); return d.promise; };
                    var writeToFileOperations = {
                        name: fileUtil.writeSongFile,
                        album_name: fileUtil.writeAlbumFile,
                        album_img: function(config, trackInfo) {
                            var writeImageDeferred = Q.defer();
                            var getImageDeferred = Q.defer();
                            
                            if(trackInfo.album_img) {
                                _retrieveAlbumImage(config, trackInfo.album_img).then(function(data) {
                                    getImageDeferred.resolve(data);
                                }, function(err) {
                                    getImageDeferred.reject(err);
                                });
                            } else {
                                getImageDeferred.resolve(null);
                            }
                            
                            // just log the error, but finish the task
                            var silentErr = function(err) {
                                log.error('(spotify._tick) album image: ' + err);
                                writeImageDeferred.resolve();
                            }
                            
                            try {
                            var imgBuffer = null;
                            getImageDeferred.promise.then(function(data) {
                                imgBuffer = data;
                            }, silentErr).then(function() {
                                fileUtil.writeAlbumImageFile(config, imgBuffer).then(function() {
                                    writeImageDeferred.resolve();
                                }, silentErr);
                            });
                            
                        }catch(e){log.error(e);}
                            return writeImageDeferred.promise;
                        } 
                    };
                    
                    var filePromises = [];
                    _.each(writeToFileOperations, function(opCallback, key) {
                        if(!perm_cache[key] || perm_cache[key] != trackInfo[key]) {
                            // update to file required
                            perm_cache[key] = trackInfo[key];
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
                });
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
    
    var shellPath = "shell/windows/retrieveSpotifyTitle.bat";
    // use absolute path if not running from executable
    if(!process.pkg) {
        shellPath = path.join(__dirname, '../..', shellPath);
    }
    
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
            deferred.reject(response.statusCode + ' ' + error);
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

// makes a call to retrieve album image
var _retrieveAlbumImage = function(config, url) {
    var deferred = Q.defer();
    
    request.get({
        url: url,
        encoding: null
    }, function(error, response, body) {
        if(response && response.statusCode !== 200) {
            deferred.reject(response.statusCode + ' ' + error);
        }
        
        if(!body) {
            deferred.reject('Expected body for _retrieveAlbumImage but got nothing instead');
        }
        
        deferred.resolve(body);
    });
    
    return deferred.promise;
};

// makes a call to google's search api to retrieve a suitable album image url
var _retrieveGoogleImageSearch = function(config, search_term) {
    var deferred = Q.defer();
    
    var invalidKeys = checkConfig.verifyGoogleSearchOperation(config);
    if(invalidKeys) {
        deferred.reject(invalidKeys);
        return deferred.promise;
    }
    
    if(!search_term) {
        deferred.reject('No search term provided');
        return deferred.promise;
    }
    
    request.get({
        url: config.GOOGLE_SEARCH_API_URL,
        qs: {
            q: search_term,
            cx: config.GOOGLE_SEARCH_ENGINE_ID,
            key: config.GOOGLE_API_KEY,
            num: 1,
            safe: 'medium',
            searchType: 'image',
            imgColorType: 'color'
        }
    }, function(error, response, body) {
        if(response && response.statusCode !== 200) {
            deferred.reject(response.statusCode + ' ' + error);
        }
        
        if(!body) {
            deferred.reject('Expected body for _retrieveGoogleImageSearch but got nothing instead');
        }
        
        deferred.resolve(body);
    });
    
    return deferred.promise;
};

exports.perform = perform;
