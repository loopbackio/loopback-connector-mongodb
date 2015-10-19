var sinon = require('sinon');
var should = require('should').noConflict();

global.should = should;
global.sinon = sinon;

var DataSource = require('loopback-datasource-juggler').DataSource;
var config = require('rc')('loopback', {test: {mongodb: {}}}).local.mongodb;

if (process.env.CI) {
  config = {
    host: 'localhost',
    database: 'lb-ds-mongodb-test-' + (
      process.env.TRAVIS_BUILD_NUMBER || process.env.BUILD_NUMBER || '1'
    ),
  };
}

global.getDataSource = global.getSchema = function (customConfig) {
  return new DataSource(require('..'), customConfig || config);
};
