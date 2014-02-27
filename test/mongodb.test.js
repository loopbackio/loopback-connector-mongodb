// This test written in mocha+should.js
var should = require('./init.js');

var User, Post, PostWithStringId, db;

describe('mongodb', function () {

  before(function () {
    db = getDataSource();

    User = db.define('User', {
      name: { type: String, index: true },
      email: { type: String, index: true },
      age: Number,
    });

    Post = db.define('Post', {
      title: { type: String, length: 255, index: true },
      content: { type: String }
    });

    PostWithStringId = db.define('PostWithStringId', {
      id: {type: String, id: true},
      title: { type: String, length: 255, index: true },
      content: { type: String }
    });

    PostWithObjectId = db.define('PostWithObjectId', {
      _id: {type: db.ObjectID, id: true},
      title: { type: String, length: 255, index: true },
      content: { type: String }
    });

    PostWithNumberId = db.define('PostWithNumberId', {
      _id: {type: Number, id: true},
      title: { type: String, length: 255, index: true },
      content: { type: String }
    });

    User.hasMany(Post);
    Post.belongsTo(User);
  });

  beforeEach(function (done) {
    User.destroyAll(function () {
      Post.destroyAll(function () {
        PostWithObjectId.destroyAll(function () {
          PostWithNumberId.destroyAll(function () {
            done();
          });
        });
      });
    });
  });

  it('should have created models with correct _id types', function (done) {
    PostWithObjectId.definition.properties._id.type.should.be.equal(db.ObjectID);
    should.not.exist(PostWithObjectId.definition.properties.id);
    PostWithNumberId.definition.properties._id.type.should.be.equal(Number);
    should.not.exist(PostWithNumberId.definition.properties.id);

    done();
  });

  it('should handle correctly type Number for id field _id', function (done) {
    PostWithNumberId.create({_id: 3, content: "test"}, function (err, person) {
      should.not.exist(err);
      should.not.exist(person.id);
      person._id.should.be.equal(3);
      
      PostWithNumberId.findById(person._id, function (err, p) {
        should.not.exist(err);
        p.content.should.be.equal("test");
        
        done();
      });
    });
  });

  it('should allow to find post by id string if `_id` is defined id', function (done) {
    PostWithObjectId.create(function (err, post) {
      PostWithObjectId.find(post._id.toString(), function (err, p) {
        should.not.exist(err);
        post = p[0];
        should.exist(post);
        post._id.should.be.an.instanceOf(db.ObjectID);

        done();
      });
    });
  });

  it('find with `_id` as defined id should return an object with _id instanceof ObjectID', function (done) {
    PostWithObjectId.create(function (err, post) {
      PostWithObjectId.findById(post._id, function (err, post) {
        should.not.exist(err);
        post._id.should.be.an.instanceOf(db.ObjectID);

        done();
      });

    });
  });

  it('should update the instance with `_id` as defined id', function (done) {
    PostWithObjectId.create({title: 'a', content: 'AAA'}, function (err, post) {
      post.title = 'b';
      PostWithObjectId.updateOrCreate(post, function (err, p) {
        should.not.exist(err);
        p._id.should.be.equal(post._id);

        PostWithObjectId.findById(post._id, function (err, p) {
          should.not.exist(err);
          p._id.should.be.eql(post._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('b');
        });

        PostWithObjectId.find({where: {title: 'b'}}, function (err, posts) {
          should.not.exist(err);
          p = posts[0];
          p._id.should.be.eql(post._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('b');
          posts.should.have.lengthOf(1);
          done();
        });
      });

    });
  });

  it('all should return object (with `_id` as defined id) with an _id instanceof ObjectID', function (done) {
    var post = new PostWithObjectId({title: 'a', content: 'AAA'})
    post.save(function (err, post) {
      PostWithObjectId.all({where: {title: 'a'}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.lengthOf(1);
        post = posts[0];
        post.should.have.property('title', 'a');
        post.should.have.property('content', 'AAA');
        post._id.should.be.an.instanceOf(db.ObjectID);

        done();
      });

    });
  });

  it('all return should honor filter.fields, with `_id` as defined id', function (done) {
    var post = new PostWithObjectId({title: 'a', content: 'AAA'})
    post.save(function (err, post) {
      PostWithObjectId.all({fields: ['title'], where: {title: 'a'}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.lengthOf(1);
        post = posts[0];
        post.should.have.property('title', 'a');
        post.should.not.have.property('content');
        should.not.exist(post._id);

        done();
      });

    });
  });



  it('hasMany should support additional conditions', function (done) {
    User.create(function (e, u) {
      u.posts.create({}, function (e, p) {
        u.posts({where: {id: p.id}}, function (err, posts) {
          should.not.exist(err);
          posts.should.have.lengthOf(1);

          done();
        });
      });
    });
  });



  it('create should return id field but not mongodb _id', function (done) {
    Post.create(function (err, post) {
      //console.log('create should', err, post);
      should.not.exist(err);
      should.exist(post.id);
      should.not.exist(post._id);

      done();
    });
  });

  it('should allow to find by id string', function (done) {
    Post.create(function (err, post) {
      Post.find(post.id.toString(), function (err, p) {
        should.not.exist(err);
        should.exist(p);

        done();
      });
    });
  });


  it('save should not return mongodb _id', function (done) {
    Post.create(function (err, post) {
      post.content = 'AAA';
      post.save(function(err, p) {
        should.not.exist(err)
        should.not.exist(p._id);
        p.id.should.be.equal(post.id);
        p.content.should.be.equal('AAA')

        done();
      });
    });
  });

  it('find should return an object with an id, which is instanceof ObjectID, but not mongodb _id', function (done) {
    Post.create(function (err, post) {
      Post.findById(post.id, function (err, post) {
        should.not.exist(err);
        post.id.should.be.an.instanceOf(db.ObjectID);
        should.not.exist(post._id);

        done();
      });

    });
  });

  it('should update the instance', function (done) {
    Post.create({title: 'a', content: 'AAA'}, function (err, post) {
      post.title = 'b';
      Post.updateOrCreate(post, function (err, p) {
        should.not.exist(err);
        p.id.should.be.equal(post.id);
        p.content.should.be.equal(post.content);
        should.not.exist(p._id);

        Post.findById(post.id, function (err, p) {
          p.id.should.be.equal(post.id);
          should.not.exist(p._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('b');

          done();
        });
      });

    });
  });

  it('all should return object with an id, which is instanceof ObjectID, but not mongodb _id', function (done) {
    var post = new Post({title: 'a', content: 'AAA'})
    post.save(function (err, post) {
      Post.all({where: {title: 'a'}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.lengthOf(1);
        post = posts[0];
        post.should.have.property('title', 'a');
        post.should.have.property('content', 'AAA');
        post.id.should.be.an.instanceOf(db.ObjectID);
        should.not.exist(post._id);

        done();
      });

    });
  });

  it('all return should honor filter.fields', function (done) {
    var post = new Post({title: 'b', content: 'BBB'})
    post.save(function (err, post) {
      Post.all({fields: ['title'], where: {title: 'b'}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.lengthOf(1);
        post = posts[0];
        post.should.have.property('title', 'b');
        post.should.not.have.property('content');
        should.not.exist(post._id);
        should.not.exist(post.id);

        done();
      });

    });
  });

  it('create should convert id from string to ObjectID if format matches',
    function (done) {
      var oid = new db.ObjectID().toString();
      PostWithStringId.create({id: oid, title: 'c', content: 'CCC'}, function (err, post) {
        PostWithStringId.findById(oid, function (err, post) {
          should.not.exist(err);
          should.not.exist(post._id);
          post.id.should.be.equal(oid);

          done();
        });
      });
    });

  it('should report error on duplicate keys', function (done) {
    Post.create({title: 'd', content: 'DDD'}, function (err, post) {
      Post.create({id: post.id, title: 'd', content: 'DDD'}, function (err, post) {
        should.exist(err);
        done();
      });
    });
  });

  it('should allow to find using like', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {title: {like: 'M.+st'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should support like for no match', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {title: {like: 'M.+XY'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });
  });

  it('should allow to find using nlike', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {title: {nlike: 'M.+st'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });
  });

  it('should support nlike for no match', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {title: {nlike: 'M.+XY'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  after(function (done) {
    User.destroyAll(function () {
      Post.destroyAll(function () {
        PostWithObjectId.destroyAll(function () {
          PostWithNumberId.destroyAll(done);
        });
      });
    });
  });
});
