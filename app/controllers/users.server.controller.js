'use strict';

var _ = require('lodash'),
	User = require('mongoose').model('User'),
	WhitelistToken = require('mongoose').model('WhitelistToken'),
	LoginAttempt = require('mongoose').model('LoginAttempt'),
	jwtTokenMgr = require('../auth/jwt/tokenMgr'),
	config = require('../../config/config'),
	jwt = require('jsonwebtoken'),
	utils = require('../util/utils.js'),
	async = require('async');

var mailer = require('../util/mailer.js');
var EmailTemplate = require('email-templates').EmailTemplate;
var path = require('path');
var templatesDir = path.resolve(__dirname, '..', 'views/mailerTemplates');
var template = new EmailTemplate(path.join(templatesDir, 'resetPasswordTemplate'));
var crypto = require('crypto');

// Create a new error handling controller method
/**
 * Get unique error field name
 */
var getUniqueErrorMessage = function (err) {
	try {
		var fieldName = err.err.substring(err.err.lastIndexOf('.$') + 2, err.err.lastIndexOf('_1'));
		return fieldName.charAt(0).toUpperCase() + fieldName.slice(1) + ' already exists';
	} catch (ex) {
		return 'Unique field already exists';
	}
};
/**
 * Get the error message from error object
 */
var getErrorMessage = function (err) {
	var message = '';

	// If an internal MongoDB error occurs get the error message
	if (err.code) {
		switch (err.code) {
			// If a unique index error occurs set the message error
			case 11000:
			case 11001:
				message = getUniqueErrorMessage(err);
				break;
			// If a general error occurs set the message error
			default:
				message = 'Something went wrong';
		}
	} else {
		// Grab the first error message from a list of possible errors
		for (var errName in err.errors) {
			if (err.errors[errName].message) {
				message = err.errors[errName].message;
			}
		}
	}

	// Return the message error
	return message;
};

/* Read */
exports.read = function (req, res) {
	var userId = req.params.userId;
	var user = req.user;

	if (req.auth.role.indexOf("admin") === -1 && req.auth.sub !== user._id.toString()) {
		return res.status(401).send({message: 'Unauthorized access. User token does not belong to requested user.'});
	}

	User.findOne({_id: userId})
		.exec(function (err, document) {
			if (err) {
				console.error("Failed to find user:", err);
				return res.status(500).send({error: err.toString()});
			}
			res.send(document);
		});
};

/* List all users */
exports.list = function (req, res) {
	var userId = req.user ?
			req.user._id :
			req.auth.sub;

	// Test if user is admin
	User.find({_id: userId, roles: 'admin'})
		.limit(1)
		.count()
		.exec(function (err, count) {
			if (err) {
				console.error("Failed to find user:", err);
				return res.status(500).send({error: err.toString()});
			}
			var query = User.find();
			// If not admin, limit to public fields.
			var options;
			if (count === 0) {
				options = {'select': User.getUserPublicFields()};
			}
			query = utils.urlToMongoQuery(req.query, query, options);
			query.exec(function (err, users) {
				if (err) {
					console.error("Failed to find users:", err);
					return res.status(500).send({error: err.toString()});
				}
				res.send(users);
			});
		});
};

/**
 * User middleware
 */
exports.userByID = function (req, res, next, id) {
	User.findById(id).exec(function (err, user) {
		if (err) return next(err);
		if (!user) return next(new Error('Failed to load User ' + id));

		req.user = user;
		next();
	});
};

/**
 * Require login routing middleware that is used to authorize authenticated
 * operations
 */
exports.requiresLogin = function (req, res, next) {
	// If a user is not authenticated send the appropriate error message
	if (!req.isAuthenticated()) {
		return res.status(401).send({
			message: 'User is not logged in'
		});
	}

	// Call the next middleware
	next();
};

/**
 * User authorizations routing middleware
 */
exports.hasAuthorization = function (roles) {
	var _this = this;

	return function (req, res, next) {
		_this.requiresLogin(req, res, function () {
			if (_.intersection(req.user.roles, roles).length) {
				return next();
			} else {
				return res.status(403).send({
					message: 'User is not authorized'
				});
			}
		});
	};
};

/**
 * Signup a new user
 */
exports.signup = function (req, res) {
	// validate required parameters
	req.assert('email', 'Email is invalid').isEmail();
	req.assert('username', 'Username must be between 6 and 15 characters long').len(6, 15);
	req.assert('firstName', 'First name is required').notEmpty();
	req.assert('lastName', 'Last name is required').notEmpty();
	req.assert('password', 'Password must be at least 8 characters').len(8, 100);
	req.assert('passwordConfirmation', 'Password confirmation is required').notEmpty();
	req.assert('password', 'Password and password confirmation do not match').equals(req.body.passwordConfirmation);

	// report error if validation failed
	var errors = req.validationErrors(true);
	if (errors) {
		res.status(400).json(errors);
		return false;
	}

	// check for existing username based on username/email
	async.parallel({
		emailInUse: function (callback) {
			User.userEmailExists(req.body.email, callback);
		},
		usernameInUse: function (callback) {
			User.usernameExists(req.body.username, callback);
		}
	}, function (err, result) {
		if (err) {
			console.error("Error while checking if username and e-mail are unique:", err);
			return res.status(500).send(err);
		}

		if (result.emailInUse) {
			return res.status(409).send({message: "email already exists"});
		}
		if (result.usernameInUse) {
			res.status(409).send({message: "username already exists"});
		}

		// Create a new 'User' model instance. Set any user property here
		var user = new User({
			username: req.body.username,
			email: req.body.email,
			password: req.body.password,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			provider: 'local',
			accountStatus: {
				verified: false,
				active: false,
				deleted: false
			},
			tokenCount: {
				allowed: config.jsonWebToken.maxLimit
			}
		});

		// Save new user document
		user.save(function (err, document) {
			if (err) {
				// Use the error handling method to get the error message
				// ZB: NB: When I was debugging earlier, the return from
				// getErrorMessage was less useful than the raw error.
				return res.status(401).send({message: getErrorMessage(err)});
			}
			res.status(201)
				.location("/users/" + user._id)
				.send(user); // FIXME do not send internal fields
		});
	});
};

/**
 * Authenticate user and generate a JWT
 */
exports.signin = function (req, res) {

	req.assert('username', 'Username is required').notEmpty();
	req.assert('password', 'Password is required').notEmpty();

	var errors = req.validationErrors(true);
	if (errors) {
		res.status(400).json(errors);
		return false;
	}

	var username = req.body.username;
	// if user comes with rememberme option
	var rememberMe = req.body.rememberme;

	// Limit the number of login attempts for each IP/Username
	async.parallel({
		ipCount: function (callback) {
			LoginAttempt.getIpCount(req.ip, callback);
		},
		ipAndUserCount: function (callback) {
			LoginAttempt.getIpUserCount(req.ip, username, callback);
		}
	}, function (err, results) {
		if (err) {
			return res.status(500).send({message: 'failed to check loginAttempt'});
		}

		// Informs user about remaining retries or lockout time
		if (results.ipCount >= config.loginAttempts.ip ||
			results.ipAndUserCount >= config.loginAttempts.ipAndUser) {
			return res.status(401).send({message: "You've reached the maximum number (" + config.loginAttempts.ipAndUser + ") of login attempts. Please try after " + config.loginAttempts.lockoutTime + "."});
		}

		// check header or url parameters or post parameters for token
		//var token = req.body.token || req.query.token || req.headers['x-access-token'];

		//we allow login with either Email or Username
		var criteria = username.indexOf('@') === -1 ? {username: username} : {email: username};

		User.findOne(criteria, function (err, user) {
			if (err) {
				console.error("Error querying users:", err);
				return res.status(401).send({message: err.toString()});
			}

			//check if user exists
			var fieldsToSet;
			if (!user) {
				fieldsToSet = {ip: req.ip, user: username};
				LoginAttempt.create(fieldsToSet, function (err, doc) {
					if (err) {
						return res.status(500).send({message: 'failed to save loginAttempt'});
					}
					return res.status(401).send({message: 'Wrong username/email and/or password'});
				});
			} else if (!user.authenticate(req.body.password)) { //Authenticate password
				fieldsToSet = {ip: req.ip, user: username};
				LoginAttempt.create(fieldsToSet, function (err, doc) {
					if (err) {
						return res.status(500).send({message: 'failed to save loginAttempt'});
					}
					return res.status(401).send({message: 'Wrong password'});
				});
			} else {

				//check if token issue limit has reached
				if (user.tokenCount.current + 1 >= config.jsonWebToken.maxLimit) {
					return res.status(403).send({message: 'max token issue limit (' + config.jsonWebToken.maxLimit + ') has been reached'});
				}

				//Check if user is inActive or account is not yet verified.
				if (!user.accountStatus.verified || !user.accountStatus.active) {
					return res.status(401).send({message: 'Your account is pending validation or is not active. Please contact the helpdesk.'});
				}

				//update user login stats
				var currLogin = user.loginStat ? user.loginStat.currLogin : Date.now();
				var currLoginIp = user.loginStat ? user.loginStat.currentLoginIp : req.ip;

				User.findOneAndUpdate(
					{_id: user._id},
					{$set: {
						tokenCount: {
							current: ++user.tokenCount.current,
							maximum: ++user.tokenCount.maximum
						},
						loginStat: {
							currLogin: Date.now(),
							lastLogin: currLogin,
							loginCount: user.loginStat.loginCount + 1,
							currentLoginIp: req.ip,
							lastLoginIp: currLoginIp
						}},
						updated: Date.now()
					},
					{new: true}, // Return the document post-, not pre-, updates.
					function (err, document) {
						if (err) {
							return res.status(500).send({message: err.toString()});
						}

						// Sucessfull login. Generate and send a new JWT access
						// token and, conditionally, new refresh token.
						var accessToken = jwtTokenMgr.generateToken(user);
						var response = {
								accessToken: accessToken,
								userId: user._id
							};

						if (rememberMe) {
							var refreshToken = jwtTokenMgr.refreshToken(user);
							response.refreshToken = refreshToken;
						}

						return res.send(response);
					}
				);
			}
		});
	});
};

//expire token either in redis, mongo or lru-cache storage
//tokenManager.expireToken(req.headers);
exports.signout = function (req, res) {

	//revoke token by adding it blacklist tokens
	if (req.auth) {
		if (req.body && req.body.token) {
			/* checking if body has refresh token and if it is found
			revoking it by deleting refresh token from whitelist */
			var tokenProfile = jwt.verify(req.body.token, config.jsonWebToken.secret);

			if (tokenProfile && req.auth.sub === tokenProfile.sub) {
				jwtTokenMgr.revoke(tokenProfile, function (err) {
					if (err) {
						console.log("unable to revoke refresh token" + err);
						// return res.status(500).send({message: err});
					}
				});
			}
		}

		// Revoking access token by adding it blacklist
		jwtTokenMgr.revoke(req.auth, function (err, result) {
			if (err) {
				// Not necessarily a 500, but close enough.
				return res.status(500).send({message: err});
			}
			res.send({message: 'User \'' + req.auth.username + '\' is signed out and token is revoked'});
		});
	} else {
		return res.status(400).send({message: "error, no information found in the token"});
	}
};

/**
 * Reset password
 */
exports.resetPassword = function (req, res) {
	req.assert('password', 'Password must be at least 8 characters').len(8, 100);
	req.assert('passwordConfirmation', 'Password confirmation is required').notEmpty();
	req.assert('password', 'Password and password confirmation do not match').equals(req.body.passwordConfirmation);

	// report error if validation failed
	var errors = req.validationErrors(true);
	if (errors) {
		res.status(400).json(errors);
		return false;
	}

	var reset = req.body;

	User.findOneAndUpdate(
		{"resetPassword.token": reset.token, "resetPassword.expires": {$gt: Date.now()}},
		{$set: {
			password: reset.password,
			updated: Date.now()
		}},
		{new: true},
		function (err, document) {
			if (err) {
				return res.status(500).send({message: err.toString()});
			}
			if (document) {
				document.resetPassword.token = undefined;
				document.resetPassword.expires = undefined;
				// A call to save is required to trigger the pre-save hook that
				// hashes the password.
				document.save(function (err, document) {
					if (err) {
						return res.status(401).send({message: getErrorMessage(err)});
					}
					return res.status(200).send({message: 'Your password has been changed successfully.'});
				});
			} else {
				//reset token invalid / expired
				return res.status(400).send({message: 'Reset token is invalid and/or expired.'});
			}
		}
	);
};

/**
 * Forgot password
 */
exports.forgotPassword = function (req, res) {
	// validate required parameters
	req.assert('email', 'Email is invalid').isEmail();
	var email = req.body.email;

	// report error if validation failed
	var errors = req.validationErrors(true);
	if (errors) {
		res.status(400).json(errors);
		return false;
	}

	crypto.randomBytes(21, function (err, buf) {
		if (err) {
			console.error(err);
			return res.status(500).send({message: err.toString()});
		}
		var resetToken = buf.toString('hex');

		var resetPassword = {
			token: resetToken,
			expires: Date.now() + 1000 * 60 * 60 // 1 hour
		};

		// Check if user's email is valid
		User.findOneAndUpdate(
			{email: email},
			{$set: {
				resetPassword: resetPassword,
				updated: Date.now()
			}},
			{new: true},
			function (err, document) {
				if (err) {
					return res.status(500).send({message: err.toString()});
				}
				if (document === null) {
					return res.status(404).send({message: 'No account with that email was found.'});
				}
				// Read sitename form config.
				var locals = {
					email: email,
					url: "http://" + config.siteName + "/#/reset/" + resetToken
				};

				template.render(locals, function (err, results) {
					if (err) {
						console.error(err);
						// Not fatal; do not send an error to the client.
					}
					mailer.transporter.sendMail({
							from: 'Admin <admin@codascent.com>',
							to: locals.email,
							subject: 'Reset your codascent[cd] password',
							html: results.html,
							text: results.text
						},
						function (err) {
							if (err) {
								console.error(err);
								return res.status(500).send({error: 'Failed to send e-mail:', err});
							}
							return res.send({message: 'An email has been sent to the email address.'});
						}
					);
				});
			}
		);
	});
};

/**
 * Update user details
 */
exports.update = function (req, res) {
	var user = req.user;

	if (user) {
		// prevent non-admin user to change user fields belong to other user.
		// jwt token 'sub' field should match with user id field
		if (req.auth.role.indexOf("admin") === -1 && req.auth.sub !== user._id.toString()) {
			return res.status(401).send({message: 'Cannot update user fields. User token does not belong to requested user.'});
		}

		if (req.auth.role.indexOf("admin") !== -1) {
			//TODO: Even Admin should not be allowed to edit few info like password.
			user = req.body;
		} else {
			// Merge existing user but only selected fields
			user = _.extend(user, _.pick(req.body, User.getUserEditableFields()));
		}

		// check for existing username based on username/email
		async.parallel({
			emailExists: function (callback) {
				User.userEmailExists(req.body.email, callback);
			},
			usernameExists: function (callback) {
				User.usernameExists(req.body.username, callback);
			}
		}, function (err, result) {
			if (err) {
				console.error("Error while checking if username and e-mail are unique:", err);
				return res.status(500).send(err);
			}

			if (!result.emailExists && !result.usernameExists) {
				return res.status(409).send({message: "No email or username found"});
			}

			User.findOneAndUpdate(
				{_id: user._id},
				{$set: {
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					accountStatus: user.accountStatus,
					roles: user.roles,
					updated: Date.now()
				}},
				{new: true},
				function (err, document) {
					if (err) {
						return res.status(500).send({message: err.toString()});
					}
					res.send(document);
				}
			);
		});
	} else {
		res.status(400).send({message: 'User \'' + user.username + '\' is not signed in'});
	}
};

// Validate old token
// Check if the user still exists and that access hasn't been revoked. Issue
// a new token with a renewed expiration.
exports.refreshToken = function (req, res) {

	// if more than 14 days old, force login
	// if (req.auth.original_iat - new Date() > 14) { // iat == issued at
	//  return res.send(401); // re-logging
	// }
	User.findById(req.auth.sub, function (err, user) {

		//report an internal error message
		if (err) {
			return res.status(500).send({message: err});
		}

		//no user found with the given id
		if (!user) {
			return res.status(401).send({message: "User '" + user.username + "' not found."}); // re-logging
		}
		// check if the user account is verified && activated
		if (!user.accountStatus.verified || !user.accountStatus.active || user.accountStatus.deleted) {
			return res.status(401).send({message: "User '" + user.username + "' is inactive, is not verified or has been deleted."});
		}

		// issue a new token, currently allowing both strategy -
		// 1. if token is not refresh token but valid access token.
		// 2. if token is valid refesh token
		if (req.auth.isRefresh) {
			WhitelistToken
				.findOne({tokenId: req.auth.jti})
				.limit(1)
				.count()
				.exec(function (err, whitelisted) {
					if (err) {
						return res.status(500).send({message: 'error occurred while trying to find refresh token'});
					}
					if (whitelisted) {
						res.send({token: jwtTokenMgr.generateToken(user)});
					} else {
						res.status(401).send({message: 'Not authorized to refresh'});
					}
				});
		} else {
			res.send({token: jwtTokenMgr.generateToken(user)});
		}
	});
};
