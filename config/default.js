var players = require('../public/js/players-enum.js');

var config = {
    'PLAYER': players.SPOTIFY,
    'UPDATE_TIME': 1000,
    
    'SPOTIFY_USERNAME': '',
    'SPOTIFY_POLL_URL': '',
    
    'SAVE_TRACK': true,
    'SAVE_ALBUM': true,
    'SAVE_ALBUM_IMAGE': true
};

module.exports = config;
