angular.module('codascentApp.testbenchServices', [])
	.factory('Testbench', testbenchService);

testbenchService.$inject = ['$resource'];

function testbenchService($resource) {
	return $resource('/api/v1/testbenchs/:testbenchId',
		{testbenchId: "@testbenchId"},
		{
			update: {method: 'PUT'},
			clone: {method: 'POST', url: '/api/v1/testbenchs/:testbenchId/clone'},
		}
	);
}

// Defaults are:

/*
 { 'get':    {method:'GET'},
  'save':   {method:'POST'},
  'query':  {method:'GET', isArray:true},
  'remove': {method:'DELETE'},
  'delete': {method:'DELETE'} };
  */
