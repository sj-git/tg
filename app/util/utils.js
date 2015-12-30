"use strict";

var exports = module.exports = {};

var mongoose = require("mongoose");
var _ = require('lodash');
var mongoUrlUtils = require('mongo-url-utils');

/* Utilities to parse url parameters*/

exports.urlToMongoQuery = function (reqQueryUrl, mongooseQuery, options) {
	if (_.isEmpty(reqQueryUrl)) {
		if (options && options.select) {
			mongooseQuery.select(options.select);
		}
	} else {
		try {
			var opts = mongoUrlUtils(reqQueryUrl);
			if (!_.isEmpty(opts.query)) {
				mongooseQuery.and(opts.query);
			}
			if (!_.isEmpty(opts.options) && opts.options.fields) {
				var fields = opts.options.fields;
				if (options && options.select) {
					fields = _.transform(options.select, function (result, n, key) {
						if (opts.options.fields[key] === undefined || opts.options.fields[key] !== 0) {
							result[key] = 1;
						}
					});
					if (_.isEmpty(fields)) {
						fields = options.select;
					}
				}
				mongooseQuery.select(fields);
			} else {
				if (options && options.select) {
					mongooseQuery.select(options.select);
				}
			}
			if (!_.isEmpty(opts.options)) {
				if (opts.options.sort) {
					mongooseQuery.sort(opts.options.sort);
				}
				if (opts.options.skip) {
					mongooseQuery.skip(opts.options.skip);
				}
				if (opts.options.limit) {
					mongooseQuery.limit(opts.options.limit);
				}
			}
		} catch (ex) {
			console.log(ex);
			if (options && options.select) {
				mongooseQuery.select(options.select);
			}
		}
	}
	return mongooseQuery;
};

