 'use strict';

var mongoose = require('mongoose'),
	crypto = require('crypto'),
	Schema = mongoose.Schema;

// TODO after auth stuff is in, evaluate which of these fields can get {select: false}
var UserSchema = new Schema({
	firstName: String,
	lastName: String,
	email: {
		type: String,
		unique: true,
		required: 'email is required',
		// Validate the email format
		match: [/.+\@.+\..+/, "Please enter a valid email address"],
		trim: true
	},
	username: {
		type: String,
		unique: true,
		required: 'Username is required',
		// validate user name
		match: [/^[a-z0-9_-]{6,15}$/i, "Username must be between 6 and 15 characters, comprised of letters, numbers, hyphens and underscores."],
		trim: true
	},
	password: {
		type: String,
		// Validate the 'password' value length
		validate: [
			function (password) {
				return password && password.length > 7;
			}, 'Password must be at least 8 characters'
		]
	},
	accountStatus: {
		verified: Boolean,
		active: Boolean,
		deleted: Boolean
	},
	salt: {
		type: String
	},
	roles: {
		type: [{
			type: String,
			enum: ['user', 'admin']
		}],
		default: ['user']
	},
	created: {
		type: Date,
		default: Date.now
	},
	updated: {
		type: Date,
		default: Date.now
	},
	resetPassword: {
		//For reset use a reset token with an expiry (which must be checked)
		token: {type: String},
		expires: {type: Date}
	},
	loginStat: { //saving login stats.  For larger stats put them into separate model
		currLogin: {type: Date, default: Date.now()},
		lastLogin: {type: Date, default: Date.now()},
		loginCount: {type: Number, default: 0},
		failedLoginCount: {type: Number, default: 0},
		currentLoginIp: {type: String, default: "0.0.0.0"},
		lastLoginIp: {type: String, default: "0.0.0.0"}
	},
	tokenCount: {
		current: {type: Number, default: 0},
		maximum: {type: Number, default: 0}
	},
	provider: {
		type: String,
		required: 'Provider is required'
	},
	providerId: String,
	providerData: {}
});

// Set the 'fullname' virtual property
UserSchema.virtual('fullName').get(function () {
	return this.firstName + ' ' + this.lastName;
}).set(function (fullName) {
	var splitName = fullName.split(' ');
	this.firstName = splitName[0] || '';
	this.lastName = splitName[1] || '';
});
// FIXME there should be no setter. Naively splitting on spaces will cause
// "Blair Van De Kamp" to have a first name of "Blair" and last name of "Van".
// Getter is fine.

// Use a pre-save middleware to hash the password
UserSchema.pre('save', function (next) {
	if (this.password) {
		this.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
		this.password = this.hashPassword(this.password);
	}

	if (this.tokenCount) {
		this.tokenCount.current++;
		this.tokenCount.maximum++;
	}

	next();
});

// Create an instance method for hashing a password
UserSchema.methods.hashPassword = function (password) {
	return crypto.pbkdf2Sync(password, this.salt, 10000, 64).toString('base64');
};

// Create an instance method for authenticating user
UserSchema.methods.authenticate = function (password) {
	return this.password === this.hashPassword(password);
};

// Find possible not used username
UserSchema.statics.findUniqueUsername = function (username, suffix, callback) {
	var _this = this;

	// Add a 'username' suffix
	var possibleUsername = username + (suffix || '');

	// Use the 'User' model 'findOne' method to find an available unique username
	_this.findOne({
		username: possibleUsername
	}, function (err, user) {
		if (err) return callback(null);

		// Otherwise find an available unique username

		// If an available unique username was found call the callback method,
		// otherwise call the 'findUniqueUsername' method again with a new
		// suffix.
		if (!user) {
			callback(possibleUsername);
		} else {
			return _this.findUniqueUsername(username, (suffix || 0) + 1, callback);
		}
	});
};

UserSchema.statics.getUserEditableFields = function () {
	return ['username', 'email', 'firstName', 'lastName'];
};

// Fields of user model which is visible to normal user.
// For e.g. in case of Sharing experiments
UserSchema.statics.getUserPublicFields = function () {
	return {'username': 1, 'email': 1, 'firstName': 1, 'lastName': 1};
};

/**
 * Checks if username is in use. If ignoredUserId is provided, ignores that user.
 * @param optional Id ignoredUserId
 * @return Boolean exists
 */
UserSchema.statics.usernameExists = function (username, ignoredUserId, callback) {
	var query = {username: username};
	if (arguments.length === 3) {
		// ignoredUserId provided
		query._id = {$ne: ignoredUserId};
	} else {
		callback = ignoredUserId;
	}
	this.find(query).limit(1).count(callback);
};

/**
 * Checks if username is in use. If ignoredUserId is provided, ignores that user.
 * @param optional Id ignoredUserId
 * @return Boolean exists
 */
UserSchema.statics.userEmailExists = function (email, ignoredUserId, callback) {
	var query = {email: email};
	if (arguments.length === 3) {
		// ignoredUserId provided
		query._id = {$ne: ignoredUserId};
	} else {
		callback = ignoredUserId;
	}
	this.find(query).limit(1).count(callback);
};
// Configure the 'UserSchema' to use getters and virtuals when transforming to JSON
UserSchema.set('toJSON', {
	getters: true,
	virtuals: true
});

mongoose.model('User', UserSchema);
