"use strict";

var exports = module.exports = {};

var mongoose = require("mongoose");
var mailer = require('../util/mailer.js');
var utils = require('../util/utils.js');

var _ = require('lodash');
var async = require("async");
var path = require('path');
var JSONStream = require("JSONStream");

var Testbench = mongoose.model("Testbench");
var Testrun = mongoose.model("Testrun");

var EmailTemplate = require('email-templates').EmailTemplate;

/* Create */
exports.create = function (req, res) {
	var userId = req.user ?
			req.user._id :
			req.auth.sub;
	// Insert default blank testbench.
	var newTestbench = new Testbench({
		createdBy: userId,
	});

	newTestbench.save(function (err, testbench) {
		if (err) {
			console.error("Failed to create testbench:", err);
			return res.status(500).send({error: err.toString()});
		}

		res.status(201)
			.location("/testbenchs/" + testbench._id)
			.send(newTestbench);
	});
};

/* List accessible testbenchs. */
exports.list = function (req, res) {
	var userId = req.user ?
			req.user._id :
			req.auth.sub;

	var query = Testbench.find({
		$or: [
			{createdBy: userId},
		]})
		.populate({
			path: "createdBy",
			model: "User",
			select: "firstName lastName email username"
		});

	query = utils.urlToMongoQuery(req.query, query);

	var stream = query.stream();
	stream.on("error", function (err) {
		console.error("Failed to find testbenchs:", err);
		return res.status(500).send({error: err.toString()});
	});

	res.set("Content-Type", "application/json");
	return stream.pipe(JSONStream.stringify()).pipe(res);
};

/* Read */
exports.read = function (req, res) {
	var testbenchId = req.params.testbenchId;

	Testbench.findOne({_id: testbenchId})
		.populate({
			path: "createdBy",
			model: "User",
			select: "firstName lastName email username"
		})
		.exec(function (err, document) {
		if (err) {
			console.error("Failed to find testbench:", err);
			return res.status(500).send({error: err.toString()});
		}
		res.send(document);
	});
};

/* Update */
exports.update = function (req, res) {
	var testbenchId = req.params.testbenchId;
	var userId = req.user ?
			req.user._id :
			req.auth.sub;

	async.waterfall([
		function (callback) {
			if (req.body.hasOwnProperty("public")) {
				Testbench
					.find({_id: testbenchId })
					.limit(1)
					.count(callback);
			} else {
				callback(null, false);
			}
		},
		function (isPR, callback) {
			var sanitizedUpdate;
			if (req.body.hasOwnProperty("public") && !isPR) {
				sanitizedUpdate = _.omit(req.body, ["_id", "public"]);
			} else {
				sanitizedUpdate = _.omit(req.body, "_id");
			}
			callback(null, sanitizedUpdate);
		},
		function (sanitizedUpdate, callback) {
			Testbench.findOneAndUpdate(
				{_id: testbenchId},
				{$set: sanitizedUpdate},
				{new: true})
				.populate({
					path: "createdBy",
					model: "User",
					select: "firstName lastName email username"
				})
				.exec(callback);
		}
	], function (err, result) {
		if (err) {
			console.error("Failed to update testbench:", err);
			return res.status(500).send({error: err.toString()});
		}
		return res.send(result);
	});
};

/* Delete */
exports.delete = function (req, res) {
	var testbenchId = req.params.testbenchId;

	function deleteByTestbenchIdWithHooks(model, callback) {
		model.find({testbenchId: testbenchId}, function (err, docs) {
			if (err) return callback(err);
			async.each(docs, function (d, cb) {
				d.remove(cb);
			}, callback);
		});
	}

	function deleteByTestbenchIdWithoutHooks(model, callback) {
		model.remove({testbenchId: testbenchId}, callback);
	}

	async.parallel([
		function (callback) {
			deleteByTestbenchIdWithHooks(Testrun, callback);
		},
		function (callback) {
			Testbench.remove({_id: testbenchId}, callback);
		}
	], function (err) {
		if (err) {
			console.error("Failed to delete testbench:", err);
			return res.status(500).send({error: err.toString()});
		}
		return res.status(204).end();
	});
};


exports.requireTestbenchWriteAccess = function (req, res, next) {
	var testbenchId = req.params.testbenchId;
	var requestingUserId = req.user ?
			req.user._id :
			req.auth.sub;

	// Note: .find().limit(1) is theoretically faster than .findOne() because
	// .find() returns a cursor, whereas .findOne() returns the document.
	Testbench.find(
		{
			_id: testbenchId,
			$or: [
				{createdBy: requestingUserId}
			]
		})
		.limit(1)
		.count(function (err, count) {
			if (err) {
				console.error("Failed to find testbench:", err);
				return res.status(500).send({error: err.toString()});
			}

			if (count) return next();
			res.status(403).end();
		});
};

exports.clone = function (req, res) {
	var testbenchId = req.params.testbenchId;
	var userId = req.user ? req.user._id : req.auth.sub;

	function save(e, c) { return e.save(c); }
	function remove(e, c) { return e.remove(c); }

	var newTestbench;

	async.waterfall([
		function (callback) {
			Testbench.findOne({_id: testbenchId}, callback);
		},
		function (originalTestbench, callback) {
			// Gather up a list of objects to save alltogether. This increases
			// memory usage a bit, so watch this section in case any models
			// become big. This technique makes methods more atomic-like.
			var saves = [];

			// Explicitly copy only the properties we want. Created, updated
			// and public should be left to defaults (now, now, false).
			var newTestbenchId = new mongoose.Types.ObjectId();
			newTestbench = new Testbench({
				_id: newTestbenchId,
				name: originalTestbench.name + " (Clone)",
				comments: originalTestbench.comments,
				createdBy: userId,
			});

			saves.push(newTestbench);

			function cloneDocument(original, callback) {
				var Constructor = original.constructor;
				var clone = new Constructor(original);
				clone._id = new mongoose.Types.ObjectId();
				clone.testbenchId = newTestbenchId;
				saves.push(clone);
				callback();
			}

			function cloneByTestbenchId(model, testbenchId, callback) {
				model.find({testbenchId: testbenchId}, function (err, results) {
					if (err) return callback(err);
					async.each(results, cloneDocument, callback);
				});
			}

			// Testrun do not clone GridFS entries; new Testrun documents
			// reference the same gridId.
			async.parallel([
				function (callback) {
					cloneByTestbenchId(Testrun, testbenchId, callback);
				},
			], function (err) {
				if (err) return callback(err);
				callback(null, saves);
			});

		},
		function (saves, callback) {
			async.each(saves, save, function (err) {
				if (err) {
					// Revert any saves that happened.
					// Might want to ignore any errors that happen here?
					async.each(saves, remove, callback);
					return callback(err);
				}
				callback();
			});
		}
	], function (err) {
		if (err) {
			console.error("Failed to clone testbench:", err);
			return res.status(500).send({error: err.toString()});
		}

		res.status(201)
			.location("/testbenchs/" + newTestbench._id)
			.send(newTestbench);
	});
};

