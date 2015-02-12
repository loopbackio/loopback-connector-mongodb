describe('mongodb imported features', function () {

  before(function () {
    require('./init.js');
  });

  require('loopback-datasource-juggler/test/common.batch.js');
  require('loopback-datasource-juggler/test/default-scope.test.js');
  require('loopback-datasource-juggler/test/include.test.js');

});
