var getPlace = require('./getPlace');
var origin = process.argv[2];
var destination = process.argv[3];

function setTerminus(terminus, station) {
    var line1 = [
        "Brochant (Paris)",
        "Porte de Clichy (Paris)",
        "Mairie de Clichy (Clichy)"
    ];
    var line2 = [
        "Pierre et Marie Curie (Ivry-sur-Seine)",
        "Porte d'Ivry (Paris)",
        "Porte de Choisy (Paris)",
        "Porte d'Italie (Paris)"
        ];
    if (line1.indexOf(station) > - 1) {
        return "Asnieres Gennevilliers Les Courtilles (Gennevilliers) (Asnières-sur-Seine)";
    } else if (line2.indexOf(station) > - 1) {
        return "Mairie d'Ivry (Ivry-sur-Seine)";
    }
    return terminus;
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

var main = function () {
    if (origin == undefined || destination == undefined) {
        console.log("Please choose a departure and a destination for your journey.");
        process.exit();
    }
    getPlace.getStopPoints(function (err, data) {
        if (err) {
            console.log(err);
            process.exit();
        } else {
            var journey = [];
            var lines = data;

            insertCollection(lines, origin, function (data) {
                if (data.length == 0) {
                    console.log("wrong input");
                    process.exit();
                }
                var station1 = data;
                insertCollection(lines, destination, function (data) {
                    if (data.length == 0) {
                        console.log("wrong input");
                        process.exit();
                    }
                    var station2 = data;
                    var log1 = "";
                    var log2 = "";
                    for (var i = 0; i < station1.length; i++)
                        log1 += i + " - " + station1[i].name + " (line " + station1[i].line + ")  ";
                    for (var i = 0; i < station2.length; i++)
                        log2 += i + " - " + station2[i].name + " (line " + station2[i].line + ")  ";
                    process.stdin.setEncoding('utf8');
                    process.stdin.setMaxListeners(0);
                    process.stdin.on('readable', function () {
                        var chunk = process.stdin.read();

                        if (chunk !== null) {
                            if (isNaN(chunk) || Number(chunk) < 0)
                                console.log('wrong input');
                            else {
                                if (journey.length == 0 && Number(chunk) <= station1.length - 1) {
                                    journey.push(station1[Number(chunk)]);
                                    console.log(log2);
                                    console.log("Choose the station ID:");
                                } else if (journey.length > 0 && Number(chunk) <= station2.length - 1) {
                                    journey.push(station2[Number(chunk)]);
                                    getPlace.processJourney(journey[0], journey[1], lines, function (data) {
                                        var shortest_journey = 0;
                                        var set = 0;
                                        for (var index = 0; index < data.length; index++) {
                                            if (shortest_journey == 0) {
                                                for (p = 0; p < data[index].length; p++) {
                                                    if (p > 0)
                                                        shortest_journey += 5;
                                                    shortest_journey += data[index][p].stations * 2;
                                                }
                                            }
                                            else {
                                                var buffer = 0;
                                                for (y = 0; y < data[index].length; y++) {
                                                    if (y > 0)
                                                        buffer += 5;
                                                    buffer += data[index][y].stations * 2;
                                                }
                                                if (buffer < shortest_journey) {
                                                    shortest_journey = buffer;
                                                    set = index;
                                                }
                                            }
                                        }
                                        var date = new Date();
                                        var hour = date.getHours();
                                        var min  = date.getMinutes();
                                        var mins = 0;
                                        if (min < 10)
                                            mins = "0"+min;
                                        else
                                            mins = min;
                                        console.log("for requested departure time: "+hour+":"+mins);
                                        var c = 0;
                                        var totalStations = 0;
                                        for (; c < data[set].length; c++) {
                                            min += 2;
                                            if (min >= 60) {
                                                hour += 1;
                                                if (hour > 24)
                                                    hour = 00;
                                                min = min - 60;

                                            }
                                            if (min < 10)
                                                mins = "0"+min;
                                            else
                                                mins = min;
                                            var terminus = setTerminus(data[set][c].direction, data[set][c].end);
                                            console.log("Line "+data[set][c].line+" from "+data[set][c].begin+" to "+data[set][c].end+" direction: "+terminus+" at "+hour+":"+mins+" total stations: "+data[set][c].stations);
                                            if (c > 0)
                                                min += 5;
                                            min += data[set][c].stations * 2;
                                            if (min > 60) {
                                                hour += 1;
                                                if (hour > 24)
                                                    hour = 00;
                                                min = min - 60;

                                            }
                                            totalStations += data[set][c].stations;
                                        }
                                        if (min < 10)
                                            min = "0"+min;
                                        console.log("Arrival at: "+hour+":"+min+" Total stations: "+totalStations+", transfers: "+ (c - 1));
                                        process.stdin.emit("end");
                                    });
                                } else
                                    console.log("wrong input");
                            }
                        } else {
                            console.log(log1);
                            console.log("Choose the station ID:");
                        }
                    });

                    process.stdin.on('end', function () {

                        process.exit();
                    });
                });
            });
        }
    });
}

main();
