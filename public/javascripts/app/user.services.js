angular.module('codascentApp.userServices', [])
	.factory('User', userService);

userService.$inject = ['$resource'];

function userService($resource) {
	return $resource('/api/v1/users/:userId',
		{userId: "@_id"},
		{
			update: {method: 'PUT'},
			register: {method: 'POST', url: "/api/v1/signup"},
			signin: {method: 'POST', url: '/api/v1/signin'},
			forgotPassword: {method: 'POST', url: '/api/v1/forgot'},
			signout: {method: 'GET', url: '/api/v1/signout'},
			resetPassword: {method: 'POST', url: '/api/v1/reset'},
			refreshToken: {method: 'POST', url: '/api/v1/tokenrefresh'}
		});
}

// Defaults are:

/*
 { 'get':    {method:'GET'},
  'save':   {method:'POST'},
  'query':  {method:'GET', isArray:true},
  'remove': {method:'DELETE'},
  'delete': {method:'DELETE'} };
  */
