var _ = require('underscore');

var log = require('./log');
var playersEnum = require('./players-enum');

// reads config values, returns boolean indicating fatal config value missing/incorrect
var foundFatalSettings = function(config) {
    var configStructure = {
        poll: {
            PLAYER: { check: _isNumber, isRequired: true, defaultValue: playersEnum.SPOTIFY },
            UPDATE_TIME: { check: _isNumber, isRequired: true, defaultValue: 2500 }
        },
        spotify: {
            USERNAME: { check: _isString, isRequired: true },
            POLL_URL: { check: _isString, isRequired: true }
        },
        file: {
            SAVE_TRACK_NAME: { check: _isBoolean, isRequired: false, defaultValue: true },
            SAVE_ALBUM_NAME: { check: _isBoolean, isRequired: false, defaultValue: true },
            SAVE_ALBUM_IMAGE: { check: _isBoolean, isRequired: false, defaultValue: true }
        }
    };
    
    return _processConfig(['config'], config, configStructure);
};

var _isType = function(options) {
    if(options.invalidFn(options.val)) {
        if(options.isRequired && _.isUndefined(options.defaultValue)) {
            log.error('(verify-config._isType) ' + options.paths.join('.') + ' is not a valid ' + options.typeName);
        } else {
            if(!_.isUndefined(options.defaultValue)) {
                log.warn('(verify-config._isType) ' + options.paths.join('.') + ' is not a valid ' + options.typeName + ', defaulting to ' + options.defaultValue);
                
                // a path is always added to beginning and end before invokng this call -- so slice should never error out
                var obj = options.root;
                _.each(options.paths.slice(1, -1), function(k) {
                    obj = obj[k];
                });
                obj[options.paths.pop()] = options.defaultValue;
                return true;
            } else {
                log.warn('(verify-config._isType) ' + options.paths.join('.') + ' is not a valid ' + options.typeName);
            }
        }
        return false;
    }
    
    return true;
};
var _isObject = function(options) { return _isType(_.extend(options, { typeName: 'object', invalidFn: function(v) { return _.isUndefined(v) || _.isNull(v); } })); };
var _isNumber = function(options) { return _isType(_.extend(options, { typeName: 'number', invalidFn: function(v) { return _.isUndefined(v) || _.isNaN(v) || v == ''; } })); };
var _isString = function(options) { return _isType(_.extend(options, { typeName: 'string', invalidFn: function(v) { return !_.isString(v) || v == ''; } })); };
var _isBoolean = function(options) { return _isType(_.extend(options, { typeName: 'boolean', invalidFn: function(v) { return !_.isBoolean(v); } })); };

// checks loaded config settings with the structure expected
var _processConfig = function(paths, obj, configStructure) {
    var _p = function(paths, root, obj, configStructure) {
        var foundInvalidRequired = false;
        if(_isObject({ paths: paths, root: root, val: obj, isRequired: true })) {
            _.each(configStructure, function(v, k) {
                var newPaths = paths.concat([k]);
                
                if(!v.check && !v.required) {
                    if(_p(newPaths, root, obj[k], configStructure[k])) {
                        foundInvalidRequired = true;
                    }
                } else {
                    if(!v.check(_.extend(v, { paths: newPaths, root: root, val: obj[k] }))) {
                        if(v.isRequired) {
                            foundInvalidRequired = true;
                        }
                    }
                }
            });
        } else {
            foundInvalidRequired = true;
            return foundInvalidRequired;
        }
        return foundInvalidRequired;
    };
    
    return _p(paths, obj, obj, configStructure);
}

exports.foundFatalSettings = foundFatalSettings;
