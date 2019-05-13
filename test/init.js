// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

module.exports = require('should');

var juggler = require('loopback-datasource-juggler');
var DataSource = juggler.DataSource;

var TEST_ENV = process.env.TEST_ENV || 'test';
var config = require('rc')('loopback', {test: {mongodb: {}}})[TEST_ENV]
  .mongodb;

config = {
  host: process.env.MONGODB_HOST || 'localhost',
  port: process.env.MONGODB_PORT || 27017,
  database:
    process.env.MONGODB_DATABASE ||
    'lb-ds-mongodb-test-' +
      (process.env.TRAVIS_BUILD_NUMBER || process.env.BUILD_NUMBER || '1'),
};

global.config = config;

var db;
global.getDataSource = global.getSchema = function(customConfig, customClass) {
  const ctor = customClass || DataSource;
  db = new ctor(require('../'), customConfig || config);
  db.log = function(a) {
    console.log(a);
  };

  return db;
};

global.resetDataSourceClass = function(ctor) {
  DataSource = ctor || juggler.DataSource;
  var promise = db ? db.disconnect() : Promise.resolve();
  db = undefined;
  return promise;
};

global.connectorCapabilities = {
  ilike: false,
  nilike: false,
  nestedProperty: true,
};
