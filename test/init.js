module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = require('rc')('loopback', {test: {mongodb:{}}}).test.mongodb;

global.getDataSource = global.getSchema = function() {
    var db = new DataSource(require('../'), config);
    db.log = function (a) { console.log(a); };

    return db;
};
