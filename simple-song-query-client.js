var fs = require('fs-extra');
var ini = require('ini');
var _ = require('underscore');

var log = require('./public/js/log');
var checkConfig = require('./public/js/verify-config');

// load config
var CONFIG_FILE = 'config.ini';
if(!fs.pathExistsSync(CONFIG_FILE)) {
    log.error('Unable to read config file "{0}"', CONFIG_FILE);
    process.exit(1);
}
var config = ini.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
log.debug('config: {0}', JSON.stringify(config));

// verify config settings
if(checkConfig.foundFatalSettings(config)) {
    log.error('Application exit because of invalid settings. Please double check config.ini');
    process.exit(1);
}

// start application
var op_spotify = require('./public/js/services/spotify');
var op;
switch(config.poll.PLAYER) {
    case 'SPOTIFY':
    default:
        op = op_spotify;
        break;
};
op.perform(config);
