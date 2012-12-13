var jdb = require('jugglingdb'),
    Schema = jdb.Schema,
    test = jdb.test,
    schema = new Schema(__dirname + '/..', {
        mongodb:   { url: 'mongodb://travis:test@localhost:27017/myapp' },
    });
schema.name = 'mongodb';

test(module.exports, schema);

