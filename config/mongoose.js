'use strict';

var config = require('./config'),
	path = require('path'),
	fs = require('fs'),
	mongoose = require('mongoose');

// database setup
var connect = function () {
	var options = {server: {socketOptions: {keepAlive: 1}}};
	// TODO username and password are not being used
	return mongoose.connect(config.database.url, options);
};

// Define the Mongoose configuration method
module.exports = function (callback) {
	// Use Mongoose to connect to MongoDB
	var db = connect();

	mongoose.connection.on("error", console.error);
	mongoose.connection.on("disconnected", function () {
		// Retry?
		console.error("Lost connection to database");
	});

	mongoose.connection.once("open", function () {
		// Load models
		fs.readdirSync(path.join(__dirname, "..", "app", "models")).forEach(function (file) {
			if (~file.indexOf('.model.js')) require(path.join(__dirname, "..", "app", "models", file));
		});

		callback(null, db);
	});
};