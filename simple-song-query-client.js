var argv = require('minimist')(process.argv.slice(2));

var log = require('./public/js/log');
var checkConfig = require('./public/js/verify-config');

log.writeLine('simple-song-query-client');

// load config
var configPath = argv.config ? argv.config : './config/default';
log.writeInit('loading config at "' + configPath + '"...');

var config = require(configPath);
log.writeInit('retrieved config...');
for(var k in config) {
    log.writeInit(k + ': ' + config[k], 1);
}

if(checkConfig.noFatalSettings(config)) {
    log.writeLine('Operation stopped because of fatal config settings found above');
}

var op_spotify = require('./public/js/services/spotify');
var op;
switch(config.PLAYER) {
    case 'SPOTIFY':
    default:
        op = op_spotify;
        break;
};
op.perform(config);
