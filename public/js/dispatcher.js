var request = require('request');
var Q = require('q');
var httpStatus = require('http-status');
var timer = require('simple-timer');

var log = require('./log');
var TIMER_NAME = 'requestTimer';

// generic request send invoker and handler
var send = function(reqOptions) {
    var deferred = Q.defer();
    var _reject = deferred.reject;
    deferred.reject = function(payload) {
        log.error(payload.error);
        _reject(payload);
    };
    
    var methodName = reqOptions.method.toUpperCase();
    var methodInvoke = request[reqOptions.method.toLowerCase()];
    
    timer.start(TIMER_NAME);
    methodInvoke(reqOptions, function(error, response, body) {
        timer.stop(TIMER_NAME);
        var errPayload = { error: null };
        
        log.http('{method} {url} {code} {codeName} ({time}ms)', {
            method: methodName,
            url: reqOptions.url,
            code: response ? response.statusCode : '"Unknown status code"',
            codeName: response ? httpStatus[response.statusCode] : '"Unknown status name"',
            time: timer.get(TIMER_NAME).delta
        });
        
        if(!response) {
            errPayload.error = 'Expected response but got nothing';
            deferred.reject(errPayload);
            return;
        }
        
        var acceptedStatusCodes = [200, 201, 204];
        if(acceptedStatusCodes.indexOf(response.statusCode) < 0) {
            errPayload.error = error || body;
            errPayload.error = JSON.stringify(errPayload.error);
            deferred.reject(errPayload);
            return;
        }
        
        if(reqOptions.expectBody && !body) {
            errPayload.error = 'Expected body but got nothing instead';
            deferred.reject(errPayload);
        }
        
        deferred.resolve(body);
    });
    
    return deferred.promise;
};

exports.send = send;
