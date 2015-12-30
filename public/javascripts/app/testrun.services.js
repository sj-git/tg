angular.module('codascentApp.testrunServices', [])
	.factory('Testrun', testrunService);

testrunService.$inject = ['$resource'];

function testrunService($resource) {
	return $resource('/api/v1/testbenchs/:testbenchId/testruns/:testrunId',
		{testbenchId: "@testbenchId", testrunId: "@_id"},
		{
			save: {
				method: 'POST',
				headers: {
					'Content-Type': undefined // let browser set it correctly
				}
			},
			update: {method: 'PUT'}
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
