var getPlace = require('./getPlace');
var origin = process.argv[2];
//var arrival = process.argv[3];

getPlace(origin, function (err, data) {
    if (err)
        console.log(err);
    else {
        console.log(data[0]);
        process.stdin.setEncoding('utf8');
        process.stdin.on('readable', function () {
            var chunk = process.stdin.read();
            if (chunk !== null) {
                process.stdout.write('data: ' + chunk);
            }
        });

        process.stdin.on('end', function () {
            process.stdout.write('end');
        });
    }
});