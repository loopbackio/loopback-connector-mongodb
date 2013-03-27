var Schema = require('jugglingdb').Schema;

global.getSchema = function() {
    var db = new Schema(require('../'), {
        url: 'mongodb://travis:test@localhost:27017/myapps'
    });
    // db.log = function (a) { console.log(a); };
    return db;
};
