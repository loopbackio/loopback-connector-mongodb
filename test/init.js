module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = require('rc')('loopback', {test: {mongodb: {}}}).test.mongodb;

if (process.env.CI) {
  config = {
    host: process.env.MONGODB_HOST || 'localhost',
    port: process.env.MONGODB_PORT || 27017,
    database: 'lb-ds-mongodb-test-' + (
      process.env.TRAVIS_BUILD_NUMBER || process.env.BUILD_NUMBER || '1'
    ),
  };
}

global.config = config;

global.getDataSource = global.getSchema = function (customConfig) {
  var db = new DataSource(require('../'), customConfig || config);
  db.log = function (a) {
    console.log(a);
  };

  return db;
};

global.sinon = require('sinon');
