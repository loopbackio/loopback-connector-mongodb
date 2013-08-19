module.exports = require('should');

var Schema = require('loopback-datasource-juggler').Schema;

global.getSchema = function() {
    var db = new Schema(require('../'), {
        url: 'mongodb://test:str0ng100pjs@166.78.158.45:27017/test'
    });
    db.log = function (a) { console.log(a); };

    return db;
};
