var fs = require('fs-extra');
var ini = require('ini');
var _ = require('underscore');
var archy = require('archy');

var log = require('./public/js/log');
var checkConfig = require('./public/js/verify-config');

// load config
var CONFIG_FILE = 'config.ini';
if(!fs.pathExistsSync(CONFIG_FILE)) {
    log.error('Unable to read config file "{0}"', CONFIG_FILE);
    process.exit(1);
}
var config = ini.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

// pretty print settings
var _toArchyNode = function(objName, obj) {
    var archyBranch = {
        label: objName,
        nodes: []
    };
    
    _.each(obj, function(v, k) {
        if(_.isArray(v)) {
            var archyArrayNode = {
                label: k,
                nodes: []
            };
            
            _.each(v, function(currVal) {
                archyArrayNode.nodes.push({ label: currVal });
            });
            archyBranch.nodes.push(archyArrayNode);
        } else if(_.isObject(v)) {
            archyBranch.nodes.push(_toArchyNode(k, v));
        } else {
            archyBranch.nodes.push({
                label: k,
                nodes: [v.toString()]
            });
        }
    });
    
    return archyBranch;
};
log.debug(archy(_toArchyNode('Application Settings', config)));

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
