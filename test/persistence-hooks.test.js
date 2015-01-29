var should = require('./init');
var suite = require('loopback-datasource-juggler/test/persistence-hooks.suite.js');

suite(global.getDataSource(), should);
