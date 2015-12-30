"use strict";

var nodemailer = require("nodemailer");
var config = require("../config/config");

exports.transporter = nodemailer.createTransport(config.mailer);
