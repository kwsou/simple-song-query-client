var players = require('../public/js/players-enum.js');

var config = {
    'PLAYER': players.SPOTIFY,
    'UPDATE_TIME': 1000,
    
    'SPOTIFY_USERNAME': '',
    'SPOTIFY_POLL_URL': '',
    
    'GOOGLE_SEARCH_API_URL': '',
    'GOOGLE_API_KEY': '',
    'GOOGLE_SEARCH_ENGINE_ID': '',
    
    'SAVE_TRACK': true,
    'SAVE_ALBUM': true,
    'SAVE_ALBUM_IMAGE': true
};

module.exports = config;
