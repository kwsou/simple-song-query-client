var _ = require('underscore');

var log = require('./log');

// reads config values, returns boolean indicating fatal config value missing/incorrect
var noFatalSettings = function(config) {
    if(!config) {
        log.error('No config found');
        return true;
    }
    
    if(_.isUndefined(config.PLAYER) || _.isNull(config.PLAYER)) {
        log.error('config.PLAYER not valid');
        return true;
    }
    
    if(_.isNaN(config.UPDATE_TIME)) {
        log.error('config.UPDATE_TIME not valid');
        return true;
    }
    
    var warnNonBooleans = [ 'SAVE_TRACK', 'SAVE_ALBUM', 'SAVE_ALBUM_IMAGE' ];
    _.each(warnNonBooleans, function(k) {
        if(!_.isBoolean(config[k])) {
            log.warn('config.' + k + ' not a valid boolean, defaulting to "true"');
            config[k] = true;
        }
    });
    
    var warnNonStrings = [ 'SPOTIFY_USERNAME', 'SPOTIFY_POLL_URL' ];
    _.each(warnNonStrings, function(k) {
        if(!_.isString(config[k]) || config[k] == '') {
            log.warn('config.' + k + ' not a valid string or empty');
        }
    });
    return false;
};

// returns any error preventing spotify poll from operating
var verifySpotifyOperation = function(config) {
    var missing = [];
    var strings = [ 'SPOTIFY_USERNAME', 'SPOTIFY_POLL_URL' ];
    _.each(strings, function(k) {
        if(!_.isString(config[k]) || config[k] == '') {
            missing.push(k);
        }
    });
    
    if(missing.length > 0) {
        return 'missing keys: ' + missing.join(',');
    }
    return null;
};

exports.noFatalSettings = noFatalSettings;
exports.verifySpotifyOperation = verifySpotifyOperation;
