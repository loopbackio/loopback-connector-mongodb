module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = require('rc')('loopback');
config = (config.test && config.test.mongodb) || {};

global.getSchema = function() {
    var db = new DataSource(require('../'), config);
    db.log = function (a) { console.log(a); };

    return db;
};
