angular.module('codascentApp').directive("contenteditable", function() {
	return {
		restrict: "A",
		require: "ngModel",
		link: function(scope, element, attrs, ngModel) {

			function read() {
				var html = element.html();
				// When we clear the content editable the browser leaves a <br> behind
				// If strip-br attribute is provided then we strip this out
				if (attrs.stripBr && html == '<br>') {
					html = '';
				}
				ngModel.$setViewValue(html);
			}

			ngModel.$render = function () {
				element.html(ngModel.$viewValue || "");
			};

			element.bind("input", function() {
				scope.$apply(read);
			});
			
			if (attrs.multiline != "true" && attrs.multiline != "multiline") {
				element.bind("keydown", onKeydown);
			} else {
				element.bind("keydown", onNewline);
			}

			function onKeydown(event) {
				if (event.keyCode === 13) {
					if (event.cancelDefault) event.cancelDefault();
					if (event.stopPropagation) event.stopPropagation();
					this.blur();
					window.getSelection().removeAllRanges();
				}
			}

			function onNewline(event) {
				if (event.keyCode === 13) {
					// TODO normalize the <div> <br> crap here
					//document.execCommand("formatBlock", false, "p");
					return false;
				}
			}
		}
	};
});
