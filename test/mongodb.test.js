require('jugglingdb/test/common.batch.js');

return;

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

test.it('should allow to find by id string', function (test) {
    Post.create(function (err, post) {
        Post.find(post.id.toString(), function (err, post) {
            test.ok(!err);
            test.ok(post);
            test.done();
        });
    });
});

test.it('find should return an object with an id, which is instanceof ObjectId', function (test) {
    Post.create(function (err, post) {
        Post.find(post.id.toString(), function (err, post) {
            test.ok(!err);
            test.ok(post.id instanceof ObjectID);
            test.done();
        });

    });

});


test.it('all should return object with an id, which is instanceof ObjectID', function (test) {
    var post = new Post({title: 'a'})
    post.save(function (err, post) {
        Post.all({where: {title: 'a'}}, function (err, posts) {
            test.ok(!err);
            test.equal(posts.length, 1);
            test.ok(posts[0].id instanceof ObjectID);
            test.done();
        });

    });

});

