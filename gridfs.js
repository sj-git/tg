var mongoose = require("mongoose");
var Grid = require("gridfs-stream");

module.exports = Grid(mongoose.connection.db, mongoose.mongo);