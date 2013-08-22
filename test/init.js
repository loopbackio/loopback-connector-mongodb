module.exports = require('should');

var Schema = require('loopback-datasource-juggler').Schema;

global.getSchema = function() {
    var db = new Schema(require('../'), {
        url: 'mongodb://test:password@127.0.0.1:27017/test'
    });
    db.log = function (a) { console.log(a); };

    return db;
};
