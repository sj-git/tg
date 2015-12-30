'use strict';

var _ = require('lodash'),
	path = require('path');

// Load app configurations
module.exports = _.extend(
	require(path.join(__dirname, 'config.json')),
	require(path.join(__dirname, 'env', process.env.NODE_ENV + '.json')) || {}
);