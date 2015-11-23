var should = require('./init');
var suite = require('loopback-datasource-juggler/test/persistence-hooks.suite.js');

var customConfig = {
  enableOptimisedfindOrCreate: false
};

if (process.env.MONGODB_VERSION &&
  require('semver').satisfies('2.6.0', '>' +
    process.env.MONGODB_VERSION)) {
  customConfig.enableOptimisedfindOrCreate = true;
}

for(var i in config) {
  customConfig[i] = config[i];
}

suite(global.getDataSource(customConfig), should);
