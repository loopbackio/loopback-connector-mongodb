require('jugglingdb/test/common.batch.js');

// This test written in mocha+should.js
var should = require('./init.js'), User, Post, db;

describe('test', function(){

    before(function(done) {
        db = getSchema();

        User = db.define('User', {
            name:      { type: String, index: true },
            email:     { type: String, index: true },
            age:          Number,
        });

        Post = db.define('Post', {
            title:     { type: String, length: 255, index: true },
            content:   { type: String }
        });

        User.hasMany(Post);
        Post.belongsTo(User);

        done();
    });

    it('hasMany should support additional conditions', function (done) {
        User.create(function (e, u) {
            u.posts.create({}, function (e, p) {
                u.posts({where: {_id: p.id}}, function (err, posts) {
                    should.not.exist(err);
                    posts.should.have.lengthOf(1);

                    done();
                });
            });
        });
    });

    it('should allow to find by id string', function (done) {
        Post.create(function (err, post) {
            Post.find(post.id.toString(), function (err, post) {
                should.not.exist(err);
                should.exist(post);

                done();
            });
        });
    });

    it('find should return an object with an id, which is instanceof ObjectId', function (done) {
        Post.create(function (err, post) {
            Post.find(post.id, function (err, post) {
                should.not.exist(err);
                post.id.should.be.an.instanceOf(db.ObjectID);
                post._id.should.be.an.instanceOf(db.ObjectID);

                done();
            });

        });
    });

    it('all should return object with an id, which is instanceof ObjectID', function (done) {
        var post = new Post({title: 'a'})
        post.save(function (err, post) {
            Post.all({where: {title: 'a'}}, function (err, posts) {
                should.not.exist(err);
                posts.should.have.lengthOf(1);
                post = posts[0];
                post.id.should.be.an.instanceOf(db.ObjectID);
                post._id.should.be.an.instanceOf(db.ObjectID);

                done();
            });

        });
    });

    after(function(done){
        User.destroyAll(function(){
            Post.destroyAll(done);
        });
    });
});

