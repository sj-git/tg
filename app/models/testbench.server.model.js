"use strict";

var mongoose = require("mongoose");

var TestbenchSchema = new mongoose.Schema({
	comments: String,
	purpose: String,
	created: {type: Date, default: Date.now},
	updated: {type: Date, default: Date.now},
	createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
});

TestbenchSchema.index({createdBy: 1});

TestbenchSchema.pre('findOneAndUpdate', function (next) {
	this.findOneAndUpdate({}, {updated: Date.now()});
	next();
});

mongoose.model("Testbench", TestbenchSchema);
