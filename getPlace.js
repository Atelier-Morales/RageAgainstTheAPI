var key = "590d659c-a3f1-49a8-8318-86cd8be744ae";
var API_URL = "api.navitia.io/v1/coverage/fr-idf";
var request = require('request');
var http = require('http');
var url = "http://" + key + "@" + API_URL;

var lineNumbers = [
    ["001", "1"],
    ["002", "2"],
    ["003", "3"],
    ["103", "3B"],
    ["004", "4"],
    ["005", "5"],
    ["006", "6"],
    ["007", "7"],
    ["107", "7B"],
    ["008", "8"],
    ["009", "9"],
    ["010", "10"],
    ["011", "11"],
    ["012", "12"],
    ["013", "13"],
    ["014", "14"]
    ];

exports.getStopPoints = function (cb) {
    var lines = [];
    var count = 0;
    for (var i = 0; i < 16; i++) {
        (function (i) {
            http.get(url + "/lines/line:OIF:100110" + lineNumbers[i][0] + ":" + lineNumbers[i][1] + "OIF439/routes?depth=3", function (request) {
                var result = "";
                request.setEncoding("utf8");
                request.on("data", function (data) {
                    result += data;
                });
                request.on("end", function () {
                    var line = JSON.parse(result);
                    var stopPoints = [];
                    count++;
                    line.routes[0].stop_points.forEach(function (value) {
                        stopPoints.push({
                            name: value.label,
                            coord: value.coord,
                            connections: []
                        });
                    });
                    lines.push({
                        name: lineNumbers[i][1],
                        stations: stopPoints
                    });
                    if (count == 16) {
                        for (var l = 0; l < lines.length; l++) {
                            for (var j = 0; j < lines[l].stations.length - 1; j++) {
                                var connect = [];
                                for (var k = 0; k < lines.length; k++) {
                                    if (lines[k].name != lines[l].name) {
                                        for (var m = 0; m < lines[k].stations.length; m++) {
                                            if (lines[k].stations[m].name === lines[l].stations[j].name)
                                                connect.push(lines[k].name);
                                        }
                                    }
                                }
                                lines[l].stations[j].connections = connect;
                            }
                        }
                        cb(null, lines);
                    }
                });
            });
        })(i);
    }
}

function insertCollection(lines, station, callback) {
    var coll = lines.slice(0);
    var stationRes = [];
    (function insertOne() {
        var record = coll.splice(0, 1)[0];
        for (var j = 0; j < record.stations.length; j++) {
            if (record.stations[j].name.toLowerCase().indexOf(station.toLowerCase()) > -1) {
                var found = false;
                var l = 0;
                for (; l < stationRes.length; l++) {
                    if (stationRes[l].name === record.stations[j].name) {
                        stationRes[l].line.push(record.name);
                        found = true;
                    }
                }
                if (found == false) {
                    stationRes.push({
                        name: record.stations[j].name,
                        line: [record.name]
                    });
                }
            }
        }
        if (coll.length == 0) {
            callback(stationRes);
        } else {
            setTimeout(insertOne, 0);
        }
    })();
}

var getStationIndex = function (station, line, network) {
    for (var i = 0; i < network.length; i++) {
        if (network[i].name === line) {
            for (var j = 0; j < network[i].stations.length; j++) {
                if (station == network[i].stations[j].name)
                    return j;
            }
        }
    }
    return 0;
}

var getLineIndex = function (line, network) {
    for (var i = 0; i < network.length; i++) {
        if (network[i].name === line) {
            return i;
        }
    }
    return 0;
}

var checkDeeper = function (station, lines, network, destination, cb) {
    var results = [];
    var found = false;

    for (var i = 0; i < lines.length; i++) {
        var lineIndex = getLineIndex(lines[i], network);
        var start = getStationIndex(station, lines[i], network);
        for (var stationIndex = getStationIndex(station, lines[i], network); stationIndex < network[lineIndex].stations.length; stationIndex++) {
            if (network[lineIndex].stations[stationIndex].name == destination) {
                results.push({
                    line: network[lineIndex].name,
                    begin: station,
                    end: network[lineIndex].stations[stationIndex].name,
                    direction: network[lineIndex].stations[network[lineIndex].stations.length - 1].name,
                    stations: stationIndex - start
                });
            }
        }
        for (var stationIndex = getStationIndex(station, lines[i], network); stationIndex >= 0; stationIndex--) {
            if (network[lineIndex].stations[stationIndex].name == destination) {
                results.push({
                    line: network[lineIndex].name,
                    begin: station,
                    end: network[lineIndex].stations[stationIndex].name,
                    direction: network[lineIndex].stations[0].name,
                    stations: start - stationIndex
                });
            }
        }
    }
    if (results.length == 0)
        cb(false);
    else
        cb(results);
}

var checkStationInLine = function (station, lines, network, destination, cb) {
    var results = [];
    var found = false;

    for (var i = 0; i < lines.length; i++) {
        var lineIndex = getLineIndex(lines[i], network);
        var start = getStationIndex(station, lines[i], network);
        for (var stationIndex = getStationIndex(station, lines[i], network); stationIndex < network[lineIndex].stations.length; stationIndex++) {
            if (network[lineIndex].stations[stationIndex].name == destination) {
                if (stationIndex - start != 0) {
                    results.push([{
                        line: network[lineIndex].name,
                        begin: station,
                        end: network[lineIndex].stations[stationIndex].name,
                        direction: network[lineIndex].stations[network[lineIndex].stations.length - 1].name,
                        stations: stationIndex - start
                    }]);
                }
            } else if (network[lineIndex].stations[stationIndex].name != destination && network[lineIndex].stations[stationIndex].connections.length > 0) {
                checkDeeper(network[lineIndex].stations[stationIndex].name, network[lineIndex].stations[stationIndex].connections, network, destination, function (data) {
                    if (data != false) {
                        if (stationIndex - start != 0) {
                            results.push([{
                                line: network[lineIndex].name,
                                begin: station,
                                end: network[lineIndex].stations[stationIndex].name,
                                direction: network[lineIndex].stations[network[lineIndex].stations.length - 1].name,
                                stations: stationIndex - start
                            }, data[0]]);
                        }
                    }
                });
            }
        }
        for (var stationIndex = getStationIndex(station, lines[i], network); stationIndex >= 0; stationIndex--) {
            if (network[lineIndex].stations[stationIndex].name == destination) {
                if (start - stationIndex != 0) {
                    results.push([{
                        line: network[lineIndex].name,
                        begin: station,
                        end: network[lineIndex].stations[stationIndex].name,
                        direction: network[lineIndex].stations[0].name,
                        stations: start - stationIndex
                    }]);
                }
            } else if (network[lineIndex].stations[stationIndex].name != destination && network[lineIndex].stations[stationIndex].connections.length > 0) {
                checkDeeper(network[lineIndex].stations[stationIndex].name, network[lineIndex].stations[stationIndex].connections, network, destination, function (data) {
                    if (data != false) {
                        if (start - stationIndex != 0) {
                            results.push([{
                                line: network[lineIndex].name,
                                begin: station,
                                end: network[lineIndex].stations[stationIndex].name,
                                direction: network[lineIndex].stations[0].name,
                                stations: start - stationIndex
                            }, data[0]]);
                        }
                    }
                });
            }
        }
    }
    if (results.length == 0)
        cb(false);
    else
        cb(results);
}

exports.processJourney = function (origin, destination, network, cb) {
    var line = origin.line.slice(0);
    var journey = [];
    var journeyCount = 0;
    (function insertJourney() {
        var record = line.splice(0, 1)[0];
        var lineIndex = getLineIndex(record, network);
        var start = getStationIndex(origin.name, record, network);
        var directLine = false;
        for (var stationIndex = getStationIndex(origin.name, record, network); stationIndex < network[lineIndex].stations.length; stationIndex++) {
            if (network[lineIndex].stations[stationIndex].name == destination.name) {
                journey.push([{
                    line: network[lineIndex].name,
                    begin: origin.name,
                    end: network[lineIndex].stations[stationIndex].name,
                    direction: network[lineIndex].stations[network[lineIndex].stations.length - 1].name,
                    stations: stationIndex - start
                    }]);
                journeyCount++;
                directLine = true;
            }
        }
        for (var stationIndex = getStationIndex(origin.name, record, network); stationIndex >= 0; stationIndex--) {
            if (network[lineIndex].stations[stationIndex].name == destination.name) {
                journey.push([{
                    line: network[lineIndex].name,
                    begin: origin.name,
                    end: network[lineIndex].stations[stationIndex].name,
                    direction: network[lineIndex].stations[0].name,
                    stations: start - stationIndex
                    }]);
                journeyCount++;
                directLine = true;
            }
        }
        if (directLine == false) {
            for (var stationIndex = getStationIndex(origin.name, record, network); stationIndex < network[lineIndex].stations.length; stationIndex++) {
                if (network[lineIndex].stations[stationIndex].connections.length > 0) {
                    checkStationInLine(network[lineIndex].stations[stationIndex].name, network[lineIndex].stations[stationIndex].connections, network, destination.name, function (data) {
                        if (data != false) {
                            for (n = 0; n < data.length; n++) {
                                var total = [];
                                if (stationIndex - start != 0) {
                                    total.push({
                                        line: network[lineIndex].name,
                                        begin: origin.name,
                                        end: network[lineIndex].stations[stationIndex].name,
                                        direction: network[lineIndex].stations[network[lineIndex].stations.length - 1].name,
                                        stations: stationIndex - start
                                    });
                                }
                                for (var q = 0; q < data[n].length; q++) {
                                    total.push(data[n][q]);
                                }
                                journey.push(total);
                                journeyCount++;
                            }
                        }
                    });
                }
            }
            for (var stationIndex = getStationIndex(origin.name, record, network); stationIndex >= 0; stationIndex--) {
                if (network[lineIndex].stations[stationIndex].connections.length > 0) {
                    checkStationInLine(network[lineIndex].stations[stationIndex].name, network[lineIndex].stations[stationIndex].connections, network, destination.name, function (data) {
                        if (data != false) {
                            for (n = 0; n < data.length; n++) {
                                var total = [];
                                if (start - stationIndex != 0) {
                                    total.push({
                                        line: network[lineIndex].name,
                                        begin: origin.name,
                                        end: network[lineIndex].stations[stationIndex].name,
                                        direction: network[lineIndex].stations[0].name,
                                        stations: start - stationIndex
                                    });
                                }
                                for (var q = 0; q < data[n].length; q++) {
                                    total.push(data[n][q]);
                                }
                                journey.push(total);
                                journeyCount++;
                            }
                        }
                    });
                }
            }
        }
        if (journeyCount > 5 || line.length == 0) {
            cb(journey);
        } else {
            setTimeout(insertJourney, 0);
        }
    })();
}
