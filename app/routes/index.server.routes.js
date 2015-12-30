'use strict';

module.exports = function (app) {
	// FIXME review the controller-like logic here.
	app.get('/', function (req, res) {
		res.render('index');
	});

	app.get("/partials/:partial", function (req, res) {
		console.log("partials/" + req.params.partial);
		res.render("partials/" + req.params.partial);
	});

};