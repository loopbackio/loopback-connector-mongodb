// This test written in mocha+should.js
var should = require('./init.js');

var User, Post, PostWithStringId, db;

describe('mongodb', function () {

  before(function () {
    db = getDataSource();

    User = db.define('User', {
      name: { type: String, index: true },
      email: { type: String, index: true, unique: true },
      age: Number,
      icon: Buffer
    }, {
      indexes: {
        name_age_index: {
          keys: {name: 1, age: -1}
        }, // The value contains keys and optinally options
        age_index: {age: -1} // The value itself is for keys
      }
    });

    Post = db.define('Post', {
      title: { type: String, length: 255, index: true },
      content: { type: String },
      comments: [String]
    }, {
      mongodb: {
        collection: 'PostCollection' // Customize the collection name
      }
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

    PostWithNumberUnderscoreId = db.define('PostWithNumberUnderscoreId', {
      _id: {type: Number, id: true},
      title: { type: String, length: 255, index: true },
      content: { type: String }
    });

    PostWithNumberId = db.define('PostWithNumberId', {
      id: {type: Number, id: true},
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
            PostWithNumberUnderscoreId.destroyAll(function () {
              PostWithStringId.destroyAll(function () {
                done();
              });
            });
          });
        });
      });
    });
  });

  it('should create indexes', function (done) {
    db.automigrate('User', function () {
      db.connector.db.collection('User').indexInformation(function (err, result) {

        var indexes =
        { _id_: [ [ '_id', 1 ] ],
          name_age_index: [ [ 'name', 1 ], [ 'age', -1 ] ],
          age_index: [ [ 'age', -1 ] ],
          name_1: [ [ 'name', 1 ] ],
          email_1: [ [ 'email', 1 ] ] };

        indexes.should.eql(result);
        done(err, result);
      });
    });
  });

  it('should have created models with correct _id types', function (done) {
    PostWithObjectId.definition.properties._id.type.should.be.equal(db.ObjectID);
    should.not.exist(PostWithObjectId.definition.properties.id);
    PostWithNumberUnderscoreId.definition.properties._id.type.should.be.equal(Number);
    should.not.exist(PostWithNumberUnderscoreId.definition.properties.id);

    done();
  });

  it('should handle correctly type Number for id field _id', function (done) {
    PostWithNumberUnderscoreId.create({_id: 3, content: "test"}, function (err, person) {
      should.not.exist(err);
      should.not.exist(person.id);
      person._id.should.be.equal(3);
      
      PostWithNumberUnderscoreId.findById(person._id, function (err, p) {
        should.not.exist(err);
        p.content.should.be.equal("test");
        
        done();
      });
    });
  });

  it('should handle correctly type Number for id field _id using string', function (done) {
    PostWithNumberUnderscoreId.create({_id: 4, content: "test"}, function (err, person) {
      should.not.exist(err);
      should.not.exist(person.id);
      person._id.should.be.equal(4);

      PostWithNumberUnderscoreId.findById('4', function (err, p) {
        should.not.exist(err);
        p.content.should.be.equal("test");

        done();
      });
    });
  });

  it('should allow to find post by id string if `_id` is defined id', function (done) {
    PostWithObjectId.create(function (err, post) {
      PostWithObjectId.find({where: {_id: post._id.toString()}}, function (err, p) {
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

  it('should support Buffer type', function (done) {
    User.create({name: 'John', icon: new Buffer('1a2')}, function (e, u) {
      User.findById(u.id, function (e, user) {
        user.icon.should.be.an.instanceOf(Buffer);
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
    Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
      //console.log('create should', err, post);
      should.not.exist(err);
      should.exist(post.id);
      should.not.exist(post._id);

      done();
    });
  });

  it('should allow to find by id string', function (done) {
    Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
      Post.findById(post.id.toString(), function (err, p) {
        should.not.exist(err);
        should.exist(p);
        done();
      });
    });
  });

  it('should allow custom collection name', function (done) {
    Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
      Post.dataSource.connector.db.collection('PostCollection').findOne({_id: post.id}, function (err, p) {
        should.not.exist(err);
        should.exist(p);
        done();
      });
    });
  });

  it('should allow to find by id using where', function (done) {
    Post.create({title: 'Post1', content: 'Post1 content'}, function (err, p1) {
      Post.create({title: 'Post2', content: 'Post2 content'}, function (err, p2) {
        Post.find({where: {id: p1.id}}, function (err, p) {
          should.not.exist(err);
          should.exist(p && p[0]);
          p.length.should.be.equal(1);
          // Not strict equal
          p[0].id.should.be.eql(p1.id);
          done();
        });
      });
    });
  });

  it('should allow to find by id using where inq', function (done) {
    Post.create({title: 'Post1', content: 'Post1 content'}, function (err, p1) {
      Post.create({title: 'Post2', content: 'Post2 content'}, function (err, p2) {
        Post.find({where: {id: {inq: [p1.id]}}}, function (err, p) {
          should.not.exist(err);
          should.exist(p && p[0]);
          p.length.should.be.equal(1);
          // Not strict equal
          p[0].id.should.be.eql(p1.id);
          done();
        });
      });
    });
  });

  it('should allow to find by number id using where', function (done) {
    PostWithNumberId.create({id: 1, title: 'Post1', content: 'Post1 content'}, function (err, p1) {
      PostWithNumberId.create({id: 2, title: 'Post2', content: 'Post2 content'}, function (err, p2) {
        PostWithNumberId.find({where: {id: p1.id}}, function (err, p) {
          should.not.exist(err);
          should.exist(p && p[0]);
          p.length.should.be.equal(1);
          p[0].id.should.be.eql(p1.id);
          done();
        });
      });
    });
  });

  it('should allow to find by number id using where inq', function (done) {
    PostWithNumberId.create({id: 1, title: 'Post1', content: 'Post1 content'}, function (err, p1) {
      PostWithNumberId.create({id: 2, title: 'Post2', content: 'Post2 content'}, function (err, p2) {
        PostWithNumberId.find({where: {id: {inq: [1]}}}, function (err, p) {
          should.not.exist(err);
          should.exist(p && p[0]);
          p.length.should.be.equal(1);
          p[0].id.should.be.eql(p1.id);
          PostWithNumberId.find({where: {id: {inq: [1, 2]}}}, function (err, p) {
            should.not.exist(err);
            p.length.should.be.equal(2);
            p[0].id.should.be.eql(p1.id);
            p[1].id.should.be.eql(p2.id);
            PostWithNumberId.find({where: {id: {inq: [0]}}}, function (err, p) {
              should.not.exist(err);
              p.length.should.be.equal(0);
              done();
            });
          });
        });
      });
    });
  });

  it('save should not return mongodb _id', function (done) {
    Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
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
    Post.create({title: 'Post1', content: 'Post content'}, function (err, post) {
      Post.findById(post.id, function (err, post) {
        should.not.exist(err);
        post.id.should.be.an.instanceOf(db.ObjectID);
        should.not.exist(post._id);

        done();
      });

    });
  });

  it('updateOrCreate should update the instance', function (done) {
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

  it('updateOrCreate should update the instance without removing existing properties', function (done) {
    Post.create({title: 'a', content: 'AAA', comments: ['Comment1']}, function (err, post) {
      post = post.toObject();
      delete post.title;
      delete post.comments;
      Post.updateOrCreate(post, function (err, p) {
        should.not.exist(err);
        p.id.should.be.equal(post.id);
        p.content.should.be.equal(post.content);
        should.not.exist(p._id);

        Post.findById(post.id, function (err, p) {
          p.id.should.be.equal(post.id);
          should.not.exist(p._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('a');
          p.comments[0].should.be.equal('Comment1');

          done();
        });
      });

    });
  });

  it('updateOrCreate should create a new instance if it does not exist', function (done) {
    var post = {id: '123', title: 'a', content: 'AAA'};
    Post.updateOrCreate(post, function (err, p) {
      should.not.exist(err);
      p.title.should.be.equal(post.title);
      p.content.should.be.equal(post.content);
      p.id.should.be.equal(post.id);

      Post.findById(p.id, function (err, p) {
        p.id.should.be.equal(post.id);
        should.not.exist(p._id);
        p.content.should.be.equal(post.content);
        p.title.should.be.equal(post.title);
        p.id.should.be.equal(post.id);

        done();
      });
    });

  });

  it('save should update the instance with the same id', function (done) {
    Post.create({title: 'a', content: 'AAA'}, function (err, post) {
      post.title = 'b';
      post.save(function (err, p) {
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

  it('save should update the instance without removing existing properties', function (done) {
    Post.create({title: 'a', content: 'AAA'}, function (err, post) {
      delete post.title;
      post.save(function (err, p) {
        should.not.exist(err);
        p.id.should.be.equal(post.id);
        p.content.should.be.equal(post.content);
        should.not.exist(p._id);

        Post.findById(post.id, function (err, p) {
          p.id.should.be.equal(post.id);
          should.not.exist(p._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('a');

          done();
        });
      });

    });
  });

  it('save should create a new instance if it does not exist', function (done) {
    var post = new Post({id: '123', title: 'a', content: 'AAA'});
    post.save(post, function (err, p) {
      should.not.exist(err);
      p.title.should.be.equal(post.title);
      p.content.should.be.equal(post.content);
      p.id.should.be.equal(post.id);

      Post.findById(p.id, function (err, p) {
        p.id.should.be.equal(post.id);
        should.not.exist(p._id);
        p.content.should.be.equal(post.content);
        p.title.should.be.equal(post.title);
        p.id.should.be.equal(post.id);

        done();
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

  it('find should order by id if the order is not set for the query filter',
    function (done) {
      PostWithStringId.create({id: '2', title: 'c', content: 'CCC'}, function (err, post) {
        PostWithStringId.create({id: '1', title: 'd', content: 'DDD'}, function (err, post) {
          PostWithStringId.find(function (err, posts) {
            should.not.exist(err);
            posts.length.should.be.equal(2);
            posts[0].id.should.be.equal('1');

            PostWithStringId.find({limit: 1, offset: 0}, function (err, posts) {
              should.not.exist(err);
              posts.length.should.be.equal(1);
              posts[0].id.should.be.equal('1');

              PostWithStringId.find({limit: 1, offset: 1}, function (err, posts) {
                should.not.exist(err);
                posts.length.should.be.equal(1);
                posts[0].id.should.be.equal('2');
                done();
              });
            });
          });
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

  it('should support "and" operator that is satisfied', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {and: [{title: 'My Post'}, {content: 'Hello'}]}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should support "and" operator that is not satisfied', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {and: [{title: 'My Post'}, {content: 'Hello1'}]}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });
  });

  it('should support "or" that is satisfied', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {or: [{title: 'My Post'}, {content: 'Hello1'}]}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should support "or" operator that is not satisfied', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {or: [{title: 'My Post1'}, {content: 'Hello1'}]}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });
  });

  it('should support "nor" operator that is satisfied', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {nor: [{title: 'My Post1'}, {content: 'Hello1'}]}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should support "nor" operator that is not satisfied', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {nor: [{title: 'My Post'}, {content: 'Hello1'}]}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });
  });

  // The where object should be parsed by the connector
  it('should support where for count', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.count({and: [{title: 'My Post'}, {content: 'Hello'}]}, function (err, count) {
        should.not.exist(err);
        count.should.be.equal(1);
        Post.count({and: [{title: 'My Post1'}, {content: 'Hello'}]}, function (err, count) {
          should.not.exist(err);
          count.should.be.equal(0);
          done();
        });
      });
    });
  });

  // The where object should be parsed by the connector
  it('should support where for destroyAll', function (done) {
    Post.create({title: 'My Post1', content: 'Hello'}, function (err, post) {
      Post.create({title: 'My Post2', content: 'Hello'}, function (err, post) {
        Post.destroyAll({and: [
          {title: 'My Post1'},
          {content: 'Hello'}
        ]}, function (err) {
          should.not.exist(err);
          Post.count(function (err, count) {
            should.not.exist(err);
            count.should.be.equal(1);
            done();
          });
        });
      });
    });
  });

  after(function (done) {
    User.destroyAll(function () {
      Post.destroyAll(function () {
        PostWithObjectId.destroyAll(function () {
          PostWithNumberId.destroyAll(function () {
            PostWithNumberUnderscoreId.destroyAll(done);
          });
        });
      });
    });
  });
});
