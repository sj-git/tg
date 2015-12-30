var testbenchsControllers = angular.module('codascentApp.testbenchControllers', []);

testbenchsControllers.controller('InboxController', [
	'$scope',
	'$state',
	'Testbench',
	function ($scope, $state, Testbench) {
		var vm = this;
		vm.testbenchs = Testbench.query({
			fields: "+created,+createdBy"
		});

		vm.newTestbench = function() {
			// Create and save a blank testbench, then go to it.
			Testbench.save(function (e) {
				$state.go('loggedIn.testbench.details', {testbenchId: e._id});
			});
		};

	}
]);

testbenchsControllers.controller("TestbenchBannerController",
	[
	"$scope",
	"$state",
	"$stateParams",
	"Testbench",
	function ($scope, $state, $stateParams, Testbench) {
		var vm = this;
		vm.testbench = Testbench.get({
			testbenchId: $stateParams.testbenchId,
			fields: "+created,+createdBy"
		});

		vm.updateTestbench = function() {
			Testbench.update(
				{testbenchId: $stateParams.testbenchId},
				vm.testbench,
				function (e) {
					vm.testbench = e;
				});
		};

	}
]);

testbenchsControllers.controller("TestbenchSidebarController",
	[
	"$scope",
	"$state",
	"$stateParams",
	"Testbench",
	function ($scope, $state, $stateParams, Testbench) {
		var vm = this;
		vm.cloneTestbench = function() {
			Testbench.clone(
				{testbenchId: $stateParams.testbenchId},
				function (value, responseHeaders) {
					$state.go("loggedIn.testbench.details", {
						testbenchId: value._id
					});
				}
			);
		};

		vm.confirmDeleteTestbench = function() {
			if (!confirm("Are you sure you want to delete this testbench?")) return;
			Testbench.delete(
				{testbenchId: $stateParams.testbenchId},
				function (value, responseHeaders) {
					$state.go("loggedIn.inbox");
				}
			);
		};

	}
]);

testbenchsControllers.controller('TestbenchDetailsController',
	[
	'$scope',
	'$state',
	'$stateParams',
	'AuthTokenFactory',
	'Testbench',
	'Testrun',
	function ($scope, $state, $stateParams, AuthTokenFactory, Testbench, Testrun) {
		var vm = this;

		vm.testbench = Testbench.get({testbenchId: $stateParams.testbenchId});

		vm.updateTestbench = function() {
			Testbench.update(
				{testbenchId: $stateParams.testbenchId},
				vm.testbench,
				function (e) {
					vm.testbench = e;
				});
		};

		function queryTestruns() {
			Testrun.query({testbenchId: $stateParams.testbenchId}, function (result) {
				vm.testruns = result;
			});
		}

		// init
		queryTestruns();

		vm.uploadFile = function(file, callback) {
			var formdata = new FormData();
			formdata.append(file.name, file);

			Testrun.save(
					{testbenchId: $stateParams.testbenchId},
					formdata,
					function (newFile, responseHeaders) {
						// success
						queryTestruns();
					});
		};

		vm.confirmDeleteTestrun = function(testrun) {
			if (!confirm("Are you sure you want to delete this testrun?")) return;
			testrun.$delete(
				{testbenchId: vm.testbench._id},
				function (value, responseHeaders) {
					queryTestruns();
				}
			);
		};

		vm.zipTestrun = function() {
			Testrun.downloadZip(
				{testbenchId: $stateParams.testbenchId},
				function (value, responseHeaders) {
					// TODO
				}
			);
		};
	}
]);

