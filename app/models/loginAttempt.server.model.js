'use strict';

//Limit the number of login attempts possible both through normal login

//Limit the number of retry attempts when logging in (for each IP). Fully customizable
//Limit the number of attempts to log in by ip/username. Fully customizable

var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	config = require('../../config/config');

var LoginAttemptSchema = new Schema({
	ip: {type: String, default: ''},
	user: {type: String, default: ''},
	time: {
		type: Date,
		default: Date.now,
		expires: config.loginAttempts.lockoutTime
		//expire option declares a TTL index (rounded to the nearest second)
		//for Date types only. (http://docs.mongodb.org/manual/core/index-ttl/)
		//Restrictions:
		//You cannot use createIndex() to change the value of expireAfterSeconds
		//of an existing index. Instead use the collMod database command in
		//conjunction with the index collection flag. Otherwise, to change the value of
		//the option of an existing index, you must drop the index first and recreate.
	}
});

LoginAttemptSchema.index({ip: 1});
LoginAttemptSchema.index({user: 1});
//LoginAttemptSchema.set('autoIndex', (app.get('env') === 'development'));

LoginAttemptSchema.statics.getIpCount = function (ip, done) {
	var conditions = {ip: ip};
	this.count(conditions, done);
};

LoginAttemptSchema.statics.getIpUserCount = function (ip, username, done) {
	var conditions = {ip: ip, user: username};
	this.count(conditions, done);
};

mongoose.model('LoginAttempt', LoginAttemptSchema);
