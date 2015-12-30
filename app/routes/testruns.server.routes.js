"use strict";

var testrunsController = require("../../app/controllers/testruns.server.controller"),
	testbenchsController = require('../../app/controllers/testbenchs.server.controller'),
	router = require("express").Router();

module.exports = function (app) {
	router.get('/testbenchs/:testbenchId/testruns/', testbenchsController.requireTestbenchWriteAccess, testrunsController.list);
	router.post('/testbenchs/:testbenchId/testruns/', testbenchsController.requireTestbenchWriteAccess, testrunsController.upload);
	router.get('/testbenchs/:testbenchId/testruns/:fileId', testbenchsController.requireTestbenchWriteAccess, testrunsController.download);
	router.put('/testbenchs/:testbenchId/testruns/:fileId', testbenchsController.requireTestbenchWriteAccess, testrunsController.update);
	router.delete('/testbenchs/:testbenchId/testruns/:fileId', testbenchsController.requireTestbenchWriteAccess, testrunsController.delete);

	//mount router under '/api/v1' URL
	app.use("/api/v1", router);

	return router;
};
