"use strict";

var exports = module.exports = {};

var mongoose = require("mongoose");
var gridfs = require("../../gridfs.js");

var Testrun = mongoose.model("Testrun");

var async = require("async");
var _ = require("lodash");
var Busboy = require("busboy");

/* Get testruns for testbench */
exports.list = function (req, res) {
	var testbenchId = req.params.testbenchId,
		query = Testrun.find({testbenchId: testbenchId});

	query.exec(function (err, testruns) {
		if (err) {
			console.error("Failed to find testruns:", err);
			return res.status(500).send({error: err.toString()});
		}

		res.send(testruns);
	});
};

/* Upload testrun */
// TODO we should enforce a maximum size besidese that specified by
// bodyParser's limit. We should also specifically disallow IMD files?
exports.upload = function (req, res) {
	var testbenchId = req.params.testbenchId;

	var busboy = new Busboy({headers: req.headers});
	busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
		console.time("Saving file", filename);

		// Save the file to gridfs
		var writestream = gridfs.createWriteStream({
			filename: filename
		});
		file.pipe(writestream);

		var testrun = new Testrun({
			gridId: writestream.id,
			filename: filename,
			testbenchId: testbenchId
		});

		// Look in the file for annotations
		writestream.on("finish", function () {
			console.timeEnd("Saving file", filename);

			// Save the entry in database
			testrun.save(function (err, testrun) {
				if (err) {
					console.error("Error creating testrun:", err);
					return res.status(500).send({error: err});
				}

				res.status(201)
					.location(req.baseUrl + "/" + req.path + "/" + testrun._id)
					.send(testrun);
			});

		});
	});
	req.pipe(busboy);
};

/* Download testrun */
exports.download = function (req, res) {
	var fileId = req.params.fileId;

	Testrun.findOne({_id: fileId}, "gridId filename",
		function (err, result) {
			if (err) {
				console.error("Error downloading file", err);
				return res.status(500).send({error: err});
			}

			if (result === null) {
				return res.status(404).send({error: "file not found"});
			}

			var readstream = gridfs.createReadStream({_id: result.gridId});
			readstream.on("error", function (err) {
				console.error("ReadStream error:", fileId, err);
				return res.status(500).send({error: err});
			});

			res.testrun(result.filename);
			readstream.pipe(res);
		}
	);
};

/* Delete fcs file */
exports.delete = function (req, res) {
	var fileId = req.params.fileId;

	async.waterfall([
			function (callback) {
				Testrun.findOne({_id: fileId}, callback);
			},
			function (testrun, callback) {
				// This is done in the callback so that the pre-remove hook gets
				// called.
				testrun.remove(callback);
			}
		],
		function (err) {
			if (err) {
				console.error("Failed to delete file", fileId, ":", err);
				return res.status(500).send({error: err.toString()});
			}
			res.status(200).end();
		}
	);
};

exports.update = function (req, res) {
	var fileId = req.params.fileId;

	var sanitizedUpdate = _.omit(req.body, 'gridId');

	Testrun.findOneAndUpdate(
		{_id: fileId},
		{$set: sanitizedUpdate},
		{new: true}, // Return the document post-, not pre-, updates.
		function (err, document) {
			if (err) {
				console.error("Failed to find and update Testrun:", err);
				return res.status(500).send({error: err.toString()});
			}

			return res.send(document);
		}
	);
};
