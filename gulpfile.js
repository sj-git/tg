var gulp = require("gulp");
var mocha = require("gulp-mocha");
var svgstore = require("gulp-svgstore");
var svgmin = require("gulp-svgmin");
var jshint = require("gulp-jshint");
var jscs = require("gulp-jscs");
var jscsstylish = require("gulp-jscs-stylish");
var fs = require("fs");

/**
 * Combines SVG files into a single SVG file for embedding and use as icons.
 */
gulp.task("svg", function () {
	fs.unlinkSync("public/images/ico.svg");

	return gulp
		.src("assets/ico/*.svg")
		.pipe(svgmin())
		.pipe(svgstore({inlineSvg: true}))
		.pipe(gulp.dest("public/images/"));
});

/**
 * Runs JSHint.
 * Uses .jshintrc.
 */
gulp.task("lint", function () {
	return gulp
		.src([
			"server.js",
			"config/*.js",
			"app/*.js",
			"app/**/*.js"
		])
		.pipe(jshint())
		.pipe(jshint.reporter("jshint-stylish"));
});

/**
 * Runs JSCS.
 * Uses .jscrc.
 */
gulp.task("jscs", function () {
	return gulp.src([
			"./server.js",
			"./config/*.js",
			"./app/*.js",
			"./app/**/*.js"
		], {base: "."})
		.pipe(jscs({
			configPath: ".jscsrc",
			esnext: true,
			fix: true
		}))
		.on("error", function () {})
		.pipe(jscsstylish())
		.pipe(gulp.dest("."));
});

gulp.task("review", ["lint", "jscs"]);

/**
 * Builds client JS files.
 */
gulp.task("build", function () {
	// TODO
});

/**
 * Runs mocha through all files in test/.
 */
gulp.task("test", function () {
	return gulp
		.src([
			"test/setup.js", // This must come first!
			"test/*.spec.js"
		], {read: false})
		.pipe(mocha({
			reporter: "spec",
			timeout: 10000,
			globals: {
				should: require("should")
			}
		}));
});
