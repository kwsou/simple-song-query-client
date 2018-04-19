var request = require('request');
var Q = require('q');
var httpStatus = require('http-status');
var timer = require('simple-timer');

var log = require('./log');
var TIMER_NAME = 'requestTimer';

// generic request send invoker and handler
var send = function(reqOptions) {
    var deferred = Q.defer();
    
    var methodName, methodInvoke;
    switch(reqOptions.method) {
        case 'POST':
        case 'post':
            methodName = 'GET';
            methodInvoke = request.post;
            break;
        case 'PATCH':
        case 'patch':
            methodName = 'PATCH';
            methodInvoke = request.patch;
            break;
        case 'DELETE':
        case 'delete':
            methodName = 'DELETE';
            methodInvoke = request.delete;
            break;
        case 'GET':
        case 'get':
        default:
            methodName = 'GET';
            methodInvoke = request.get;
            break;
    }
    
    timer.start(TIMER_NAME);
    methodInvoke(reqOptions, function(error, response, body) {
        timer.stop(TIMER_NAME);
        var errPayload = { error: null };
        
        if(!response) {
            errPayload.error = 'Expected response but got nothing';
            
            log.error('{method} {url} - {err}', {
                method: methodName,
                url: reqOptions.url,
                err: payload.error
            });
            
            deferred.reject(errPayload);
            return;
        }
        
        log.http('{method} {url} {code} {codeName} ({time}ms)', {
            method: methodName,
            url: reqOptions.url,
            code: response.statusCode,
            codeName: httpStatus[response.statusCode],
            time: timer.get(TIMER_NAME).delta
        });
        
        var acceptedStatusCodes = [200, 201, 204];
        if(acceptedStatusCodes.indexOf(response.statusCode) < 0) {
            errPayload.error = error || body;
            errPayload.error = JSON.stringify(errPayload.error);
            deferred.reject(errPayload);
            return;
        }
        
        if(reqOptions.expectBody && !body) {
            errPayload.error = 'Expected body but got nothing instead';
            log.error(errPayload.error);
            deferred.reject(errPayload);
        }
        
        deferred.resolve(body);
    });
    
    return deferred.promise;
};

exports.send = send;
