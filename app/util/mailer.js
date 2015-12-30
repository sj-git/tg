"use strict";
var nodemailer = require('nodemailer');
var config = require("../../config/config");

// Prepare nodemailer transport object
exports.transporter = nodemailer.createTransport(config.mailer);
