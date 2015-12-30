angular.module('codascentApp').config([
	"$stateProvider",
	"$httpProvider",
	function ($stateProvider, $httpProvider) {
		$stateProvider
			.state("signin", {
				url: "/",
				templateUrl: "/partials/signin",
				controller: "SigninController as vm"
			})
			.state("signup", {
				url: "/signup",
				templateUrl: "/partials/signup",
				controller: "SignupController as vm"
			})
			.state("forgotPassword", {
				url: "/forgot",
				templateUrl: "/partials/forgotPassword",
				controller: "ForgotPasswordController as vm"
			})
			.state("resetPassword", {
				url: "/reset/:token",
				templateUrl: "/partials/resetPassword",
				controller: "ResetPasswordController as vm"
			})
			.state("users", {
				url: "/users",
				templateUrl: "/partials/userList",
				controller: "UserListController as vm"
			})
			.state("userDetails", {
				url: "/users/:userId",
				templateUrl: "/partials/user",
				controller: "UserDetailsController as vm"
			})
			.state("loggedIn", {
				abstract: true,
				template: "<!-- userScope --><div ui-view></div>",
				controller: "LoggedInController as uservm"
			})
			.state("loggedIn.inbox", {
				url: "/testbenchs",
				templateUrl: "/partials/inbox",
				controller: "InboxController as vm"
			})
			.state("loggedIn.testbench", {
				abstract: true,
				url: "/testbenchs/:testbenchId",
				views: {
					"": {
						template: "<!-- testbenchScope --><div class='banner' ui-view='banner'></div><div class='body'><div class='main' ui-view='main'></div><div class='nav' ui-view='sidebar'></div></div>"
					},
					"sidebar@loggedIn.testbench": {
						templateUrl: "/partials/testbench-sidebar",
						controller: "TestbenchSidebarController as vm"
					},
					"banner@loggedIn.testbench": {
						templateUrl: "/partials/testbench-banner",
						controller: "TestbenchBannerController as vm"
					}
				}
			})
			.state("loggedIn.testbench.details", {
				url: "",
				views: {
					main: {
						templateUrl: "/partials/testbench-details-main",
						controller: "TestbenchDetailsController as vm"
					}
				}
			});

		$httpProvider.interceptors.push("AuthInterceptor");
		$httpProvider.interceptors.push("GlobalErrorInterceptor");
	}
]).run(function ($state, $rootScope) {
	$rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState) {
		$state.previous = fromState;
	});
	$state.go("signin");
});
