angular.module("codascentApp")
.factory("GlobalErrorInterceptor", [
	"$q",
	function ($q) {
		var statusBar = document.getElementById("status");
		var statusBarWidth = 0;
		var dispatchedRequests = 0;
		var resolvedRequests = 0;

		return {
			request: function (config) {
				dispatchedRequests++;
				statusBarWidth = 100 * resolvedRequests / dispatchedRequests;
				statusBar.style.width = statusBarWidth + "%";
				return config || $q.when(config);
			},

			response: function (response) {
				resolvedRequests++;
				if (resolvedRequests === dispatchedRequests) {
					resolvedRequests = 0;
					dispatchedRequests = 0;
					statusBar.style.width = "100%";
					setTimeout(function () {
						statusBar.style.width = "0%";
					}, 750);
				} else {
					statusBarWidth = 100 * resolvedRequests / dispatchedRequests;
					statusBar.style.width = statusBarWidth + "%";
				}
				return response || $q.when(response);
			},

			responseError: function (rejection) {
				console.error(rejection);
				var errorDiv = document.getElementById("error");
				errorDiv.textContent = "Something went wrong. Please try refreshing the page.";
				errorDiv.style.display = "inherit";
				setTimeout(function () {
					errorDiv.style.display = "none";
				}, 10000);
				return $q.reject(rejection);
			}
		}
	}
]);
