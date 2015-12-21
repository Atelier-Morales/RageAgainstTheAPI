var key = "590d659c-a3f1-49a8-8318-86cd8be744ae";
var API_URL = "api.navitia.io/v1/coverage/fr-idf";
var request = require('request');
var url = "http://" + key + "@" + API_URL + "/pt_objects?q=";
module.exports = function (origin, cb) {
    request({
        url: url + origin + "&type[]=stop_point"
    }, function (error, response, body) {
        // Do more stuff with 'body' here
        if (error)
            cb(err, null);
        var result = JSON.parse(body);
        cb(null, result.pt_objects);
    });
}