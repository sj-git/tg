angular.module('codascentApp').directive("droplet", function() {
	return {
		restrict: "A",
		link: function($scope, element, attrs, ngModel) {
			element.on("dragover", function dragover(e) {
				e.preventDefault();
			});

			window.addEventListener("dragenter", function dragenter(e) {
				e.preventDefault();
				element.css("display", "inherit");
			});

			element.on("dragover", function dragover(e) {
				e.preventDefault();
			});

			element.on("dragleave", function dragleave(e) {
				// TODO fade out
				element.css("display", "none");
			});

			element.on("drop", function (e) {
				e.stopPropagation();
				e.preventDefault();

				element.css("display", "none");

				var dt = e.dataTransfer,
					files = Array.prototype.slice.call(dt.files);
				function recUp() {
					if (!files.length) return;
					$scope.vm.uploadFile(files.pop(), recUp);
				}
				recUp();
			});
		}
	};
});
