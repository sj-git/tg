var authsControllers = angular.module('codascentApp.authControllers', []);

/**
 * Abstract.
 */
authsControllers.controller("LoggedInController", [
	"$scope",
	"$state",
	"AuthTokenFactory",
	"jwtHelper",
	"User",
	function ($scope, $state, AuthTokenFactory, jwtHelper, User) {
		var vm = this;

		var jwt = AuthTokenFactory.getToken();

		vm.user = {
			jwt: jwt,
			id: jwtHelper.decodeToken(jwt).sub,
			admin: jwtHelper.isAdmin(AuthTokenFactory.getToken()),
			logout: function() {
				User.signout(
					function (response) {
						AuthTokenFactory.setToken();
						AuthTokenFactory.setRefreshToken();
						$state.go('signin');
					});
			}
		};
	}
]);

authsControllers.controller('SigninController', [
	'$state',
	'User',
	'AuthTokenFactory',
	'jwtHelper',
	function ($state, User, AuthTokenFactory, jwtHelper) {
		var vm = this;

		var token = AuthTokenFactory.getToken();
		if (token && !jwtHelper.isTokenExpired(token)) {
			//Go to Inbox if valid token is present and user is not logged out.
			$state.go('loggedIn.inbox');
		}

		vm.login = function (user) {
			User.signin(
				user,
				function success(response) {
					AuthTokenFactory.setToken(response.accessToken);
					AuthTokenFactory.setRefreshToken(response.refreshToken);

					// On successfull login go Testbench Inbox.
					$state.go('loggedIn.inbox');
				},
				function (error) {
					// TODO add nicer interface to this:
					var errorDiv = document.getElementById("error");
					errorDiv.textContent = error.data.message;
					errorDiv.style.display = "inherit";
					setTimeout(function () {
						errorDiv.style.display = "none";
					}, 10000);
				}
			);
		};
	}
]);

authsControllers.controller('SignupController', [
	'$state',
	'User',
	function ($state, User) {
		var vm = this;

		vm.signup = function (user) {
			User.register(
				user,
				function (response) {
					$state.go('signin');
				}
			);
		};
	}
]);

authsControllers.controller('ForgotPasswordController', [
	'$state',
	'User',
	function ($state, User) {
		var vm = this;

		vm.forgotPassword = function (email) {
			vm.error = null;
			vm.success = null;

			User.forgotPassword(
				{email: email},
				function success(response) {
					//$state.go('signin');
					vm.success = response.message;
				}
			);
		};

	}
]);

authsControllers.controller('ResetPasswordController', [
	'$state',
	'User',
	function ($state, User) {
		var vm = this;
		var url = window.location.href;
		var token = url.substr(url.lastIndexOf("/") + 1);

		vm.resetPassword = function (password, passwordConfirmation) {
			vm.error = null;
			vm.success = null;

			if (password !== passwordConfirmation) {
				vm.error = 'Passwords do not match.';
				return;
			}

			User.resetPassword(
				{
					token: token,
					password: password,
					passwordConfirmation: passwordConfirmation
				},
				function success(response) {
					vm.success = response.message;
					vm.password = null;
					vm.passwordConfirmation = null;
				}
			);
		};

	}
]);
