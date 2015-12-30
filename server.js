'use strict';

var cluster = require("cluster");

// Default to 'development' environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var config = require('./config/config.js');

var workerCount = config.workerCount || require("os").cpus().length - 2;

if (cluster.isMaster) {
	console.log('----------------------------------------------------------------------');
	console.log(config.app.title + ' configuration');
	console.log('----------------------------------------------------------------------');
	console.log('Environment:\t\t' + process.env.NODE_ENV);
	console.log('Port:\t\t\t' + config.port);
	console.log('Database:\t\t' + config.database.url);
	console.log('Worker count:\t\t' + workerCount);
	if (process.env.NODE_ENV === 'production') {
		console.log('HTTPs:\t\t\ton');
	}
	console.log('----------------------------------------------------------------------');

	for (var i = 0; i < workerCount; i++) {
		cluster.fork();
	}
	cluster.on("exit", function (worker, code, signal) {
		console.info("Worker " + worker.process.pid + " died");
	});
} else {

	// Connect the database
	require('./config/mongoose.js')(function (err, db) {
		// Create a new Express application instance
		var app = require('./config/express.js')(db);

		// Eagerly initialize the mail transport
		require("./app/mailer.js");

		// Boot and log the server status to the console
		var server = app.listen(config.port, function () {
			console.log('Express server listening on port ' + server.address().port);
		});
	});

}