"use strict";

var mongoose = require("mongoose");
var gridfs = require("../../gridfs.js");

var TestrunSchema = new mongoose.Schema({
	filename: String,
	gridId: {type: mongoose.Schema.Types.ObjectId, required: true},
	testbenchId: {type: mongoose.Schema.Types.ObjectId, required: true},
	type: {type: String} // might make this an enum, UserTestrun, ...
});

TestrunSchema.index({testbenchId: 1});

TestrunSchema.pre("remove", function (next) {
	// Keep in mind that hooks are only called on instances, not on the schema.
	// Thus, fcsfile.remove() invokes this, but FcsFile.remove({}) does not.
	// Do not remove gridfs entry if there are references from clones.
	// This can be skipped entirely in some GLP mode where raw data must never
	// be deleted.
	var _this = this;
	this.constructor.find({gridId: this.gridId, _id: {$ne: this._id}})
		.limit(1)
		.count(function (err, count) {
			if (err) return next(err);
			if (count) {
				console.log("Other Testruns reference this GridID, not removing.");
				next();
			} else {
				console.log("Removing", _this.gridId, "from gridfs");
				gridfs.remove({_id: _this.gridId}, next);
			}
		});
});

mongoose.model("Testrun", TestrunSchema);
