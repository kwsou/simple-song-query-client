var enumCount = 0;
var add = function(obj, key) {
    obj[key] = enumCount;
    enumCount++;
};

var players = {};
add(players, 'SPOTIFY');

module.exports = players;
