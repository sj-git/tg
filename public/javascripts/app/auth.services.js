'use strict';

angular.module('codascentApp.authServices', [])
	.factory('AuthInterceptor', AuthInterceptor)
	.factory('AuthTokenFactory', AuthTokenFactory);

function AuthInterceptor(AuthTokenFactory, jwtHelper) {
	return {
		request: addToken
	};

	function addToken(config) {
		var token = AuthTokenFactory.getToken();
		if (token) {
			var isTokenExpired = jwtHelper.isTokenExpired(token);

			if (isTokenExpired) {
				// TODO Refresh Token here.
			}
			config.headers = config.headers || {};
			config.headers.Authorization = 'Bearer ' + token;
		}
		return config;
	}
}

function AuthTokenFactory($window) {
	var store = $window.localStorage;
	var key = 'auth-token';
	var keyRefresh = 'refresh-token';

	return {
		getToken: getToken,
		getRefreshToken: getRefreshToken,
		setToken: setToken,
		setRefreshToken: setRefreshToken
	};

	//Returns token from localStorage
	function getToken() {
		return store.getItem(key);
	}

	//Returns refresh token from localStorage
	function getRefreshToken() {
		return store.getItem(keyRefresh);
	}

	//Store Refresh Token in localstorage, if user closes browser.
	function setRefreshToken(token) {
		if (token) {
			store.setItem(keyRefresh, token);
		} else {
			store.removeItem(keyRefresh);
		}
	}

	//Store Token in localstorage, if user closes browser.
	function setToken(token) {
		if (token) {
			store.setItem(key, token);
		} else {
			store.removeItem(key);
		}
	}
}
