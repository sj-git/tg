'use strict';

exports.render = function (req, res) {
	// Use the 'response' object to render the 'index' view with a 'title' and 'userFullName' properties
	res.render('index', {
		//user: req.user || null,
		//request: req
	});
};