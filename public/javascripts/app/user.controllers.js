var usersControllers = angular.module('codascentApp.userControllers', []);

usersControllers.controller('UserListController', ['$state', 'User','AuthTokenFactory',
	function ($state, User, AuthTokenFactory ) {
		var vm = this;
		vm.users = User.query();
	}
]);

usersControllers.controller('UserDetailsController',
	[
	'$stateParams',
	'User',
	'AuthTokenFactory',
	'jwtHelper',
	function ($stateParams, User, AuthTokenFactory, jwtHelper) {
		var vm = this;

		vm.adminUser = jwtHelper.isAdmin(AuthTokenFactory.getToken());

		User.get({userId: $stateParams.userId},
			function (response) {
				vm.user = response;
			});

		vm.updateUser = function() {
			vm.user.$update(
				{userId: $stateParams.userId},
				function (response) {
					vm.user = response;
				});
		};
	}
]);
