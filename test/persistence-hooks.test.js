var semver = require('semver');
var should = require('./init');
var suite = require('loopback-datasource-juggler/test/persistence-hooks.suite.js');

var customConfig = {
  enableOptimisedfindOrCreate: false
};

if (process.env.MONGODB_VERSION &&
    semver.satisfies(process.env.MONGODB_VERSION, '>= 2.6.0')) {
  customConfig.enableOptimisedfindOrCreate = true;
}

for(var i in config) {
  customConfig[i] = config[i];
}

suite(global.getDataSource(customConfig), should);
