'use strict';

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var WhitelistTokenSchema = new Schema({
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

});

WhitelistTokenSchema.index({tokenId: 1});

mongoose.model('WhitelistToken', WhitelistTokenSchema);
