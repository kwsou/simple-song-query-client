var logger = require('npmlogger');
var strFormat = require('string-format');

var _log = function(level, msg, msgObj) {
    logger.log(level, '', msgObj ? strFormat(msg, msgObj) : msg);
};

var debug = function(msg, msgObj) { _log('debug', msg, msgObj); };
var info = function(msg, msgObj) { _log('info', msg, msgObj); };
var http = function(msg, msgObj) { _log('http', msg, msgObj); };
var warn = function(msg, msgObj) { _log('warn', msg, msgObj); };
var error = function(msg, msgObj) { _log('error', msg, msgObj); };

exports.debug = debug;
exports.info = info;
exports.http = http;
exports.warn = warn;
exports.error = error;

// one time init code to configure npmlog
logger.addLevel('debug', 1500, { fg: 'blue', bg: 'black' }, 'debug');
logger.level = 'debug';
logger.prefixStyle = { fg: 'cyan' };
logger.style.http = { fg: 'magenta', bg: 'black' };
logger.stream = {
    isTTY: false,
    write: function() {}
};

// one time init code to configure npmlogger
logger.fileLevel = 'debug';
logger.fileCreatePath = true;
logger.fileBasePath = './logs';
logger.fileName = 'client';
logger.fileDatePrefix = 'isoDate';
