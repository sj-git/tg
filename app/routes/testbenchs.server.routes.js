'use strict';

var users = require('../../app/controllers/users.server.controller'),
	testbenchsController = require('../../app/controllers/testbenchs.server.controller'),
	router = require("express").Router();

module.exports = function (app) {
	//testbench API routes
	router.post('/testbenchs/', testbenchsController.create);
	router.get('/testbenchs/', testbenchsController.list);
	router.get('/testbenchs/:testbenchId', testbenchsController.requireTestbenchWriteAccess, testbenchsController.read);
	router.put('/testbenchs/:testbenchId', testbenchsController.requireTestbenchWriteAccess, testbenchsController.update);
	router.delete('/testbenchs/:testbenchId', testbenchsController.requireTestbenchWriteAccess, testbenchsController.delete);
	router.post('/testbenchs/:testbenchId/clone/', testbenchsController.requireTestbenchWriteAccess, testbenchsController.clone);

	//mount router under '/api/v1' URL
	app.use("/api/v1", router);

	return router;
};
