'use strict';

var BlacklistToken = require('mongoose').model('BlacklistToken'),
	WhitelistToken = require('mongoose').model('WhitelistToken'),
	jwt = require('jsonwebtoken'),
	expressJWT = require('express-jwt'),
	btoa = require('btoa'),
	config = require('../../../config/config');

var isRevokedCallback = function (req, payload, done) {

	var tokenId = payload.jti;
	if (!tokenId) {
		// if it does not have jti it cannot be revoked
		return done(null, false);
	}

	var tokenIdentifier = payload.aud + ':' + payload.jti;

	//check blacklist token collection to see if token is revoked
	BlacklistToken
		.findOne({tokenId: tokenIdentifier, userId: payload.sub})
		.limit(1)
		.count()
		.exec(done);

	//var blacklisted = jtiCache.get(tokenIdentifier);
	//if (typeof blacklisted !== 'undefined') { return done(null, blacklisted); }

	// getRevokedTokenByIdentifier(tokenIdentifier, function(err, token){
	// if (err) { return done(err); }
	// 	blacklisted = !!token;
	// 	jtiCache.set(tokenIdentifier,blacklisted)
	// 	return done(null, blacklisted);
	// });
};

exports.revoke = function (req, done) {
	if (req.isRefresh) {
		// revoke Refresh token by removing from whitelist
		revokeRefreshToken(req, done);
	} else {
		//revoke access token by adding it blacklist tokens
		revokeToken(req, done);
	}
};

/**
 * Adds token contained in payload to blacklisttoken collection.
 * @param payload object Minimally, {aud: String, jti: String}
 */
function revokeToken(payload, done) {
	// if it does not have jti it cannot be revoked
	if (!payload.jti) {
		return done(new Error("Missing token identifier from token"));
	}

	//Mark token as blacklisted by saving in Blacklist collection
	var tokenIdentifier = payload.aud + ':' + payload.jti;
	var exp = new Date();

	new BlacklistToken({
		tokenId: tokenIdentifier,
		userId: payload.sub,
		tokenExpires: exp.setTime(payload.exp * 1000)
	}).save(done);
}

/**
 * Deletes refresh token from WhitelistToken collection. Used when user logged
 * out and for admin revoke-all.
 */
function revokeRefreshToken(req, done) {
	WhitelistToken.findOneAndRemove({tokenId: req.jti}, done);
}

exports.verifyToken = function (nonAuthPath) {
	return expressJWT({
		secret: config.jsonWebToken.secret,
		credentialsRequired: true,
		audience: config.jsonWebToken.audience,
		issuer: config.jsonWebToken.issuer,
		userProperty: 'auth', //JWT payload will be bound to this value (req.{value}
		isRevoked: isRevokedCallback,
		getToken: function fromHeaderOrQuerystring(req) {
			// Allow the JWT to be passed in the header or the query string
			if (req.headers && req.headers.authorization) {
				var parts = req.headers.authorization.split(' ');
				if (parts.length == 2 && /^Bearer$/.test(parts[0])) {
					return parts[1];
				} else {
					throw new Error('credentials_bad_format', {message: 'Format is Authorization: Bearer [token]'});
				}
			} else if (req.query && req.query.token) {
				return req.query.token;
			}
			return null;
		}
	}).unless({path: nonAuthPath, ext: ['.jpg', '.html', '.css', '.js', '.map']});
	// Use unless specify exception: routes that will not be restricted
};

/**
 * Create a new JWT token for a given user
 */
exports.generateToken = function (user) {

	// Remove password property from user object
	//user = _.pick(user, '_id', 'name' ,'email');
	var options = {
		subject: user._id,
		audience: config.jsonWebToken.audience,
		issuer: config.jsonWebToken.issuer,
		expiresInMinutes: config.jsonWebToken.expirationInMins //Note: jwt token(exp) gets stored in UTC
	};

	//As per JWT spec proposes the jti (JWT ID) as a means to identify a token.
	//The jti (JWT ID) claim provides a unique identifier for the JWT

	//var uuid = require('node-uuid');
	// res.write("V1 (time-based): "+uuid.v1()+"\n");
	// res.end(  "V4 (random):     "+uuid.v4()+"\n");
	return jwt.sign({
			role: user.roles,
			fullName: user.fullName,
			jti: btoa(Date.now() * Math.random())
		}, config.jsonWebToken.secret, options);
};

/**
 * Create a new refresh JWT token for a user who logged in with rememberme
 * option on.
 */
exports.refreshToken = function (user) {
	var options = {
		subject: user._id,
		audience: config.jsonWebToken.audience,
		issuer: config.jsonWebToken.issuer,
	};

	var jtiRefresh = btoa(Date.now() * Math.random());

	var refreshToken = jwt.sign(
		{
			role: user.roles,
			fullName: user.fullName,
			jti: jtiRefresh,
			isRefresh: true
		}, config.jsonWebToken.secret, options);

	// save refresh token in whitelist
	new WhitelistToken({
		tokenId: jtiRefresh,
		userId: user._id
	}).save(function (err) {
		if (err) {
			console.error(err);
			throw err;
		}
	});

	return refreshToken;
};
