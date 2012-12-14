var jdb = require('jugglingdb'),
    Schema = jdb.Schema,
    test = jdb.test,
    schema = new Schema(__dirname + '/..', {
        url: 'mongodb://travis:test@localhost:27017/myapp'
    });

var ObjectID = require('mongodb').ObjectID;

schema.name = 'mongodb';

test(module.exports, schema);

test.it('hasMany should support additional conditions', function (test) {

    Post = schema.models.Post;
    User = schema.models.User;

    User.create(function (e, u) {
        u.posts.create({}, function (e, p) {
            console.log(arguments);
            u.posts({where: {_id: p.id}}, function (e, posts) {
                console.log(arguments);
                test.equal(posts.length, 1, 'There should be only 1 post.');
                test.done();
            });
        });
    });

});
