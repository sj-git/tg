'use strict';

// Load the module dependencies
var users = require('../../app/controllers/users.server.controller'),
	router = require("express").Router();

module.exports = function (app) {
	router.post('/signup', users.signup);
	router.post('/signin', users.signin);
	router.get('/signout', users.signout);
	router.post('/forgot', users.forgotPassword);
	router.post('/reset', users.resetPassword);
	router.post('/tokenrefresh', users.refreshToken);
	router.param('userId', users.userByID);
	router.get('/users', users.list);
	router.get('/users/:userId', users.read);
	router.put('/users/:userId', users.update);

	//mount router under '/api/v1' URL
	app.use("/api/v1", router);

	return router;

};
