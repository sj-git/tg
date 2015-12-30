'use strict';

var config = require('./config'),
	express = require('express'),
	logger = require('morgan'),
	compress = require('compression'),
	favicon = require('serve-favicon'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	methodOverride = require('method-override'),
	expressValidator = require('express-validator'),
	flash = require('connect-flash'),
	path = require('path'),
	https = require('https'),
	fs = require('fs'),
	jwtTokenMgr = require('../app/auth/jwt/tokenMgr');

// Define the Express configuration method
module.exports = function (db) {

	// Create a new Express application instance
	var app = express();

	app.set("port", config.port);

	// Use the 'NODE_ENV' variable to activate the 'morgan' logger
	app.use(logger('dev'));
	app.use(compress());

	// Use the 'body-parser' and 'method-override' middleware functions
	app.use(bodyParser.urlencoded({extended: false, limit: '5gb'}));
	app.use(cookieParser());
	app.use(bodyParser.json());
	app.use(expressValidator());
	app.use(methodOverride());
	app.use(express.static(path.join(__dirname, "..", 'public')));

	// JWT Auth Middleware - This will check if the token is valid
	// Only the requests that start with /api/v1/experiments will be checked
	// for the token.
	// Specify a list of paths that do not need authentication
	// TODO
	var nonAuthPath = [
		"/",
		"/signup",
		"/signin",
		"/signout",
		"/api/v1/signup",
		"/api/v1/signin",
		"/api/v1/forgot",
		"/api/v1/reset",
		/^\/experiments.*/,
		/^\/partials\/.*/
	];

	app.use(jwtTokenMgr.verifyToken(nonAuthPath));

	app.use(favicon(path.join(__dirname, "..", "public", "favicon.ico")));

	// Set the application view engine and 'views' folder
	app.set("views", path.join(__dirname, "..", "app", "views"));
	app.set("view engine", "jade");

	// Configure the flash messages middleware
	// FIXME there probably is no use for this with angular.
	app.use(flash());

	// Load the routing files
	// Note: Currently all routing files have both api and non-api routes. Non-
	// api routes will be removed once our angular app will call api routes.
	fs.readdirSync(path.join(__dirname, "..", "app", "routes")).forEach(function (file) {
		if (~file.indexOf('.js')) {
			require(path.join(__dirname, "..", "app", "routes", file))(app);
		}
	});

	// Configure static file serving
	app.use(express.static(path.join(__dirname, 'public')));

	// Catch 404 and forward to error handler
	app.use(function (req, res, next) {
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});

	// error handler
	app.use(function (err, req, res, next) {
		console.error({
			message: err.message,
			error: err
		});
		res.status(err.status || 500).send({error: err.message});
	});

	if (app.get('env') === 'production') {
		// Load SSL key and certificate
		var privateKey = fs.readFileSync(path.join('.', 'config', 'sslcerts', 'key.pem'), 'utf8');
		var certificate = fs.readFileSync(path.join('.', 'config', 'sslcerts', 'cert.pem'), 'utf8');

		var httpsOptions = {
			key: privateKey,
			cert: certificate
		};

		// Create HTTPS Server
		var httpsServer = https.createServer(httpsOptions, app);
		return httpsServer;
	}

	// Return the Express application instance
	return app;
};
