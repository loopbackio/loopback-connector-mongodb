var should = require('./init');
var suite = require('loopback-datasource-juggler/test/persistence-hooks.suite.js');

var customConfig = {
    "test": {
        "mongodb": {
            "enableOptimisedfindOrCreate": false,
        }
    }
};

if (process.env.MONGODB_VERSION &&
        require('semver').satisfies('2.6.0', '>' +
        process.env.MONGODB_VERSION)) {
            customConfig.test.mongodb.enableOptimisedfindOrCreate = true;
        }


suite(global.getDataSource(customConfig), should);
