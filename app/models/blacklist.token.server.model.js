'use strict';

var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	config = require('../../config/config');

var BlacklistTokenSchema = new Schema({
	tokenId: {
		type: String,
		unique: true,
		required: true
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	tokenExpires: {type: Date, expires: config.jsonWebToken.expirationInMins * 60, default: Date.now}
});

BlacklistTokenSchema.index({token: 1, userId: 1});

mongoose.model('BlacklistToken', BlacklistTokenSchema);
