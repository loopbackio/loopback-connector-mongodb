// This test written in mocha+should.js
var semver = require('semver');
var should = require('./init.js');

var Superhero, User, Post, PostWithStringId, db;

describe('mongodb connector', function () {

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

    Superhero = db.define('Superhero', {
      name: { type: String, index: true },
      power: { type: String, index: true, unique: true },
      address: { type: String, required: false, index: { mongodb: { unique: false, sparse: true } } },
      description: { type: String, required: false },
      geometry: { type: Object, required: false, index: { mongodb: { kind: "2dsphere" } } },
      age: Number,
      icon: Buffer
    }, {mongodb: {collection: 'sh'}});

    Post = db.define('Post', {
      title: { type: String, length: 255, index: true },
      content: { type: String },
      comments: [String]
    }, {
      mongodb: {
        collection: 'PostCollection' // Customize the collection name
      }
    });

    Product = db.define('Product', {
      name: { type: String, length: 255, index: true },
      description:{ type: String},
      price: { type: Number },
      pricehistory: { type: Object }
    }, {
      mongodb: {
        collection: 'ProductCollection' // Customize the collection name
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
    User.settings.mongodb = {};
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

  describe('.ping(cb)', function() {
    it('should return true for valid connection', function(done) {
      db.ping(done);
    });

    it('should report connection errors', function(done) {
      var ds = getDataSource({
        host: 'localhost',
        port: 4 // unassigned by IANA
      });
      ds.ping(function(err) {
        (!!err).should.be.true;
        err.message.should.match(/connect ECONNREFUSED/);
        done();
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

  it('should create complex indexes', function (done) {
    db.automigrate('Superhero', function () {
      db.connector.db.collection('sh').indexInformation(function (err, result) {

        var indexes =
        { _id_: [ [ '_id', 1 ] ],
          geometry_2dsphere: [ [ 'geometry', '2dsphere' ] ],
          power_1: [ [ 'power', 1 ] ],
          name_1: [ [ 'name', 1 ] ],
          address_1: [ [ 'address', 1 ] ] };

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
        post.should.have.property('content', undefined);
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

  it('should invoke hooks', function(done) {
    var events = [];
    var connector = Post.getDataSource().connector;
    connector.observe('before execute', function(ctx, next) {
      ctx.req.command.should.be.string;
      ctx.req.params.should.be.array;
      events.push('before execute ' + ctx.req.command);
      next();
    });
    connector.observe('after execute', function(ctx, next) {
      ctx.res.should.be.object;
      events.push('after execute ' + ctx.req.command);
      next();
    });
    Post.create({title: 'Post1', content: 'Post1 content'}, function(err, p1) {
      Post.find(function(err, results) {
        events.should.eql(['before execute insert', 'after execute insert',
          'before execute find', 'after execute find']);
        connector.clearObservers('before execute');
        connector.clearObservers('after execute');
        done(err, results);
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

  describe('updateAll', function () {
    it('should update the instance matching criteria', function (done) {
      User.create({name: 'Al', age: 31, email:'al@strongloop'}, function (err1, createdusers1) {
        should.not.exist(err1);
        User.create({name: 'Simon', age: 32,  email:'simon@strongloop'}, function (err2, createdusers2) {
          should.not.exist(err2);
          User.create({name: 'Ray', age: 31,  email:'ray@strongloop'}, function (err3, createdusers3) {
            should.not.exist(err3);

            User.updateAll({age:31},{company:'strongloop.com'},function(err,updatedusers) {
              should.not.exist(err);
              updatedusers.should.have.property('count', 2);

              User.find({where:{age:31}},function(err2,foundusers) {
                should.not.exist(err2);
                foundusers[0].company.should.be.equal('strongloop.com');
                foundusers[1].company.should.be.equal('strongloop.com');

                done();
              });

            });
          });
        });
      });

    });

    it('should clean the data object', function (done) {
      User.dataSource.settings.allowExtendedOperators = true;

      User.create({name: 'Al', age: 31, email:'al@strongloop'}, function (err1, createdusers1) {
        should.not.exist(err1);
        User.create({name: 'Simon', age: 32,  email:'simon@strongloop'}, function (err2, createdusers2) {
          should.not.exist(err2);
          User.create({name: 'Ray', age: 31,  email:'ray@strongloop'}, function (err3, createdusers3) {
            should.not.exist(err3);

            User.updateAll({}, {age: 40, '$set': {age: 39}},function(err,updatedusers) {
              should.not.exist(err);
              updatedusers.should.have.property('count', 3);

              User.find({where:{age:40}},function(err2, foundusers) {
                should.not.exist(err2);
                foundusers.length.should.be.equal(0);

                User.find({where:{age:39}}, function(err3, foundusers) {
                  should.not.exist(err3);
                  foundusers.length.should.be.equal(3);

                  User.updateAll({}, {'$set': {age: 40}, age: 39}, function(err, updatedusers) {
                    should.not.exist(err);
                    updatedusers.should.have.property('count', 3);

                    User.find({where:{age:40}},function(err2, foundusers) {
                      should.not.exist(err2);
                      foundusers.length.should.be.equal(3);

                      User.find({where:{age:39}}, function(err3, foundusers) {
                        should.not.exist(err3);
                        foundusers.length.should.be.equal(0);

                        done();
                      });
                    });
                  });

                });
              });
            });

          });
        });
      });

    });

    var describeMongo26 = describe;
    if (process.env.MONGODB_VERSION &&
        !semver.satisfies(process.env.MONGODB_VERSION, '~2.6.0')) {
      describeMongo26 = describe.skip;
    }

    describeMongo26('extended operators', function() {

      it('should use $set by default if no operator is supplied', function(done) {
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);
          User.create({name: 'Simon', age: 32, email: 'simon@strongloop'}, function(err2, createdusers2) {
            should.not.exist(err2);
            User.create({name: 'Ray', age: 31, email: 'ray@strongloop'}, function(err3, createdusers3) {
              should.not.exist(err3);

              User.updateAll({name: 'Simon'}, {name: 'Alex'}, function(err, updatedusers) {
                should.not.exist(err);
                updatedusers.should.have.property('count', 1);

                User.find({where: {name: 'Alex'}}, function(err, founduser) {
                  should.not.exist(err);
                  founduser.length.should.be.equal(1);
                  founduser[0].name.should.be.equal('Alex');

                  done();
                });
              });

            });
          });
        });
      });
      
      it('should be possible to enable per model settings', function(done) {
        User.dataSource.settings.allowExtendedOperators = null;
        User.settings.mongodb = { allowExtendedOperators: true };
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {'$rename': {name: 'firstname'}}, function(err, updatedusers) {
            should.not.exist(err);
            updatedusers.should.have.property('count', 1);

            User.find({where: {firstname: 'Al'}}, function(err, foundusers) {
              should.not.exist(err);
              foundusers.length.should.be.equal(1);

              done();
            });

          });
        });
      });

      it('should not be possible to enable per model settings when globally disabled', function(done) {
        User.dataSource.settings.allowExtendedOperators = false;
        User.settings.mongodb = { allowExtendedOperators: true };
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {'$rename': {name: 'firstname'}}, function(err, updatedusers) {
            should.exist(err);
            err.name.should.equal('MongoError');
            err.errmsg.should.equal('The dollar ($) prefixed field \'$rename\' in \'$rename\' is not valid for storage.');
            done();
          });
        });
      });

      it('should not be possible to use when disabled per model settings', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.settings.mongodb = { allowExtendedOperators: false };
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {'$rename': {name: 'firstname'}}, function(err, updatedusers) {
            should.exist(err);
            err.name.should.equal('MongoError');
            err.errmsg.should.equal('The dollar ($) prefixed field \'$rename\' in \'$rename\' is not valid for storage.');
            done();
          });
        });
      });
      
      it('should be possible to enable using options - even if globally disabled', function(done) {
        User.dataSource.settings.allowExtendedOperators = false;
        var options = { allowExtendedOperators: true };
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);
          
          User.updateAll({name: 'Al'}, {'$rename': {name: 'firstname'}}, options, function(err, updatedusers) {
            should.not.exist(err);
            updatedusers.should.have.property('count', 1);

            User.find({where: {firstname: 'Al'}}, function(err, foundusers) {
              should.not.exist(err);
              foundusers.length.should.be.equal(1);

              done();
            });

          });
        });
      });
      
      it('should be possible to disable using options - even if globally disabled', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        var options = { allowExtendedOperators: false };
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {'$rename': {name: 'firstname'}}, options, function(err, updatedusers) {
            should.exist(err);
            err.name.should.equal('MongoError');
            err.errmsg.should.equal('The dollar ($) prefixed field \'$rename\' in \'$rename\' is not valid for storage.');
            done();
          });
        });
      });

      it('should be possible to use the $inc operator', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);
          User.create({name: 'Simon', age: 32, email: 'simon@strongloop'}, function(err2, createdusers2) {
            should.not.exist(err2);
            User.create({name: 'Ray', age: 31, email: 'ray@strongloop'}, function(err3, createdusers3) {
              should.not.exist(err3);

              User.updateAll({name: 'Ray'}, {'$inc': {age: 2}}, function(err, updatedusers) {
                should.not.exist(err);
                updatedusers.should.have.property('count', 1);

                User.find({where: {name: 'Ray'}}, function(err, foundusers) {
                  should.not.exist(err);
                  foundusers.length.should.be.equal(1);
                  foundusers[0].age.should.be.equal(33);

                  done();
                });
              })

            });
          });
        });
      });

      it('should be possible to use the $min and $max operators', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create({name: 'Simon', age: 32, email: 'simon@strongloop'}, function(err2, createdusers2) {
          should.not.exist(err2);

          User.updateAll({name: 'Simon'}, {'$max': {age: 33}}, function(err, updatedusers) {
            should.not.exist(err);
            updatedusers.should.have.property('count', 1);

            User.updateAll({name: 'Simon'}, {'$min': {age: 31}}, function(err, updatedusers) {
              should.not.exist(err);
              updatedusers.should.have.property('count', 1);

              User.find({where: {name: 'Simon'}}, function(err, foundusers) {
                should.not.exist(err);
                foundusers.length.should.be.equal(1);
                foundusers[0].age.should.be.equal(31);

                done();
              });

            });
          });

        });
      });

      it('should be possible to use the $mul operator', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {'$mul': {age: 2}}, function(err, updatedusers) {
            should.not.exist(err);
            updatedusers.should.have.property('count', 1);

            User.find({where: {name: 'Al'}}, function(err, foundusers) {
              should.not.exist(err);
              foundusers.length.should.be.equal(1);
              foundusers[0].age.should.be.equal(62);

              done();
            });

          });

        });
      });

      it('should be possible to use the $rename operator', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {'$rename': {name: 'firstname'}}, function(err, updatedusers) {
            should.not.exist(err);
            updatedusers.should.have.property('count', 1);

            User.find({where: {firstname: 'Al'}}, function(err, foundusers) {
              should.not.exist(err);
              foundusers.length.should.be.equal(1);

              done();
            });

          });
        });

      });

      it('should be possible to use the $unset operator', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(err1, createdusers1) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {'$unset': {email: ''}}, function(err, updatedusers) {
            should.not.exist(err);
            updatedusers.should.have.property('count', 1);

            User.find({where: {name: 'Al'}}, function(err, foundusers) {
              should.not.exist(err);
              foundusers.length.should.be.equal(1);
              should.not.exist(foundusers[0].email);

              done();
            });

          });
        });

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
          p.id.should.be.eql(post.id);
          should.not.exist(p._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('b');

          done();
        });
      });

    });
  });

  it('updateAttributes: $addToSet should append item to an Array if it doesn\'t already exist', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90}]}, function (err, product) {

      var newattributes= {$set : {description:'goes well with butter'}, $addToSet : { pricehistory: { '2014-12-12':110 } } };

      product.updateAttributes(newattributes, function (err1, inst) {
        should.not.exist(err1);

        Product.findById(product.id, function (err2, updatedproduct) {
          should.not.exist(err2);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
          updatedproduct.pricehistory[1]['2014-12-12'].should.be.equal(110);
          done();
        });
      });
    });
  });

  it('updateOrCreate: $addToSet should append item to an Array if it doesn\'t already exist', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90}]}, function (err, product) {

      product.$set = {description:'goes well with butter'};
      product.$addToSet = { pricehistory: { '2014-12-12':110 } };

      Product.updateOrCreate(product, function (err, updatedproduct) {
        should.not.exist(err);
        should.not.exist(updatedproduct._id);
        updatedproduct.id.should.be.eql(product.id);
        updatedproduct.name.should.be.equal(product.name);
        updatedproduct.description.should.be.equal('goes well with butter');
        updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
        updatedproduct.pricehistory[1]['2014-12-12'].should.be.equal(110);

        done();

      });
    });
  });


  it('updateOrCreate: $addToSet should not append item to an Array if it does already exist', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

      product.$set = {description:'goes well with butter'};
      product.$addToSet = { pricehistory: { '2014-10-10':80 } };

      Product.updateOrCreate(product, function (err, updatedproduct) {
        should.not.exist(err);
        should.not.exist(updatedproduct._id);
        updatedproduct.id.should.be.eql(product.id);
        updatedproduct.name.should.be.equal(product.name);
        updatedproduct.description.should.be.equal('goes well with butter');
        updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
        updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);

        done();

      });
    });
  });

  it('updateAttributes: $addToSet should not append item to an Array if it does already exist', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

      var newattributes= {$set : {description:'goes well with butter'}, $addToSet : { pricehistory: { '2014-12-12':110 } } };

      product.updateAttributes(newattributes, function (err1, inst) {
        should.not.exist(err1);

        Product.findById(product.id, function (err2, updatedproduct) {
          should.not.exist(err2);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
          updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
          done();
        });
      });
    });
  });


  it('updateAttributes: $pop should remove first or last item from an Array', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{'2014-10-10':80},{'2014-09-09':70}]}, function (err, product) {

      var newattributes= {$set : {description:'goes well with butter'}, $addToSet : { pricehistory: 1 } };

      product.updateAttributes(newattributes, function (err1, inst) {
        should.not.exist(err1);

        Product.findById(product.id, function (err2, updatedproduct) {
          should.not.exist(err2);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
          updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
          done();
        });
      });
    });
  });

  it('updateOrCreate: $pop should remove first or last item from an Array', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{'2014-10-10':80},{'2014-09-09':70}]}, function (err, product) {

      product.$set = {description:'goes well with butter'};
      product.$pop = { pricehistory: 1 };

      Product.updateOrCreate(product, function (err, updatedproduct) {
        should.not.exist(err);
        should.not.exist(updatedproduct._id);
        updatedproduct.id.should.be.eql(product.id);
        updatedproduct.name.should.be.equal(product.name);
        updatedproduct.description.should.be.equal('goes well with butter');
        updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
        updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);

        updatedproduct.$pop = { pricehistory: -1 };
        Product.updateOrCreate(product, function (err, p) {
          should.not.exist(err);
          should.not.exist(p._id);
          updatedproduct.pricehistory[0]['2014-10-10'].should.be.equal(80);
          done();
        });
      });
    });
  });

  it('updateAttributes: $pull should remove items from an Array if they match a criteria', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[70,80,90,100]}, function (err, product) {

      var newattributes= {$set : {description:'goes well with butter'}, $pull: { pricehistory: {$gte:90 } } };

      product.updateAttributes(newattributes, function (err1, updatedproduct) {
        should.not.exist(err1);
        Product.findById(product.id, function (err2, updatedproduct) {
          should.not.exist(err1);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0].should.be.equal(70);
          updatedproduct.pricehistory[1].should.be.equal(80);

          done();
        });
      });
    });
  });

  it('updateOrCreate: $pull should remove items from an Array if they match a criteria', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[70,80,90,100]}, function (err, product) {

      product.$set = {description:'goes well with butter'};
      product.$pull = { pricehistory: {$gte:90 }};

      Product.updateOrCreate(product, function (err, updatedproduct) {
        should.not.exist(err);
        should.not.exist(updatedproduct._id);
        updatedproduct.id.should.be.eql(product.id);
        updatedproduct.name.should.be.equal(product.name);
        updatedproduct.description.should.be.equal('goes well with butter');
        updatedproduct.pricehistory[0].should.be.equal(70);
        updatedproduct.pricehistory[1].should.be.equal(80);

        done();
      });
    });
  });

  it('updateAttributes: $pullAll should remove items from an Array if they match a value from a list', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[70,80,90,100]}, function (err, product) {

      var newattributes= {$set : {description:'goes well with butter'}, $pullAll : { pricehistory: [80,100]} };

      product.updateAttributes(newattributes, function (err1, inst) {
        should.not.exist(err1);

        Product.findById(product.id, function (err2, updatedproduct) {
          should.not.exist(err2);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0].should.be.equal(70);
          updatedproduct.pricehistory[1].should.be.equal(90);

          done();
        });

      });
    });
  });

  it('updateOrCreate: $pullAll should remove items from an Array if they match a value from a list', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[70,80,90,100]}, function (err, product) {

      product.$set = {description:'goes well with butter'};
      product.$pullAll = { pricehistory: [80,100]};

      Product.updateOrCreate(product, function (err, updatedproduct) {
        should.not.exist(err);
        should.not.exist(updatedproduct._id);
        updatedproduct.id.should.be.eql(product.id);
        updatedproduct.name.should.be.equal(product.name);
        updatedproduct.description.should.be.equal('goes well with butter');
        updatedproduct.pricehistory[0].should.be.equal(70);
        updatedproduct.pricehistory[1].should.be.equal(90);

        done();
      });
    });
  });


  it('updateAttributes: $push should append item to an Array even if it does already exist', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

      var newattributes= {$set : {description:'goes well with butter'}, $push : { pricehistory: { '2014-10-10':80 } } };

      product.updateAttributes(newattributes, function (err1, inst) {
        should.not.exist(err1);

        Product.findById(product.id, function (err2, updatedproduct) {
          should.not.exist(err2);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
          updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
          updatedproduct.pricehistory[2]['2014-10-10'].should.be.equal(80);

          done();
        });
      });
    });
  });

  it('updateOrCreate: $push should append item to an Array even if it does already exist', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

      product.$set = {description:'goes well with butter'};
      product.$push = { pricehistory: { '2014-10-10':80 } };

      Product.updateOrCreate(product, function (err, updatedproduct) {
        should.not.exist(err);
        should.not.exist(updatedproduct._id);
        updatedproduct.id.should.be.eql(product.id);
        updatedproduct.name.should.be.equal(product.name);
        updatedproduct.description.should.be.equal('goes well with butter');
        updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
        updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
        updatedproduct.pricehistory[2]['2014-10-10'].should.be.equal(80);

        done();

      });
    });
  });

  it('updateOrCreate: should handle combination of operators and top level properties without errors', function (done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create({name: 'bread', price: 100, ingredients:['flour'],pricehistory:[{'2014-11-11':90},{ '2014-10-10':80 }]}, function (err, product) {

      product.$set = {description:'goes well with butter'};
      product.$push = { ingredients: 'water' };
      product.$addToSet = { pricehistory: { '2014-09-09':70 } };
      product.description = 'alternative description';

      Product.updateOrCreate(product, function (err, updatedproduct) {
        should.not.exist(err);
        should.not.exist(updatedproduct._id);
        updatedproduct.id.should.be.eql(product.id);
        updatedproduct.name.should.be.equal(product.name);
        updatedproduct.description.should.be.equal('goes well with butter');
        updatedproduct.ingredients[0].should.be.equal('flour');
        updatedproduct.ingredients[1].should.be.equal('water');
        updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
        updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
        updatedproduct.pricehistory[2]['2014-09-09'].should.be.equal(70);

        done();

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
          p.id.should.be.eql(post.id);
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
      p.id.should.be.eql(post.id);

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
          p.id.should.be.eql(post.id);
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
          p.id.should.be.eql(post.id);
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
        post.should.have.property('content', undefined);
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

  it('should allow to find using case insensitive like', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {title: {like: 'm.+st', options: 'i'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should allow to find using case insensitive like', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {content: {like: 'HELLO', options: 'i'}}}, function (err, posts) {
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

  it('should allow to find using case insensitive nlike', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {title: {nlike: 'm.+st', options: 'i'}}}, function (err, posts) {
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

  it('should support neq for match', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {title: {neq: 'XY'}}}, function (err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should support neq for no match', function (done) {
    Post.create({title: 'My Post', content: 'Hello'}, function (err, post) {
      Post.find({where: {title: {neq: 'My Post'}}}, function (err, posts) {
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

  context('regexp operator', function() {
    before(function deleteExistingTestFixtures(done) {
      Post.destroyAll(done);
    });
    beforeEach(function createTestFixtures(done) {
      Post.create([
        {title: 'a', content: 'AAA'},
        {title: 'b', content: 'BBB'}
      ], done);
    });
    after(function deleteTestFixtures(done) {
      Post.destroyAll(done);
    });

    context('with regex strings', function() {
      context('using no flags', function() {
        it('should work', function(done) {
          Post.find({where: {content: {regexp: '^A'}}}, function(err, posts) {
            should.not.exist(err);
            posts.length.should.equal(1);
            posts[0].content.should.equal('AAA');
            done();
          });
        });
      });

      context('using flags', function() {
        beforeEach(function addSpy() {
          sinon.stub(console, 'warn');
        });
        afterEach(function removeSpy() {
          console.warn.restore();
        });

        it('should work', function(done) {
          Post.find({where: {content: {regexp: '^a/i'}}}, function(err, posts) {
            should.not.exist(err);
            posts.length.should.equal(1);
            posts[0].content.should.equal('AAA');
            done();
          });
        });

        it('should print a warning when the global flag is set',
            function(done) {
          Post.find({where: {content: {regexp: '^a/g'}}}, function(err, posts) {
            console.warn.calledOnce.should.be.ok;
            done();
          });
        });
      });
    });

    context('with regex literals', function() {
      context('using no flags', function() {
        it('should work', function(done) {
          Post.find({where: {content: {regexp: /^A/}}}, function(err, posts) {
            should.not.exist(err);
            posts.length.should.equal(1);
            posts[0].content.should.equal('AAA');
            done();
          });
        });
      });


      context('using flags', function() {
        beforeEach(function addSpy() {
          sinon.stub(console, 'warn');
        });
        afterEach(function removeSpy() {
          console.warn.restore();
        });

        it('should work', function(done) {
          Post.find({where: {content: {regexp: /^a/i}}}, function(err, posts) {
            should.not.exist(err);
            posts.length.should.equal(1);
            posts[0].content.should.equal('AAA');
            done();
          });
        });

        it('should print a warning when the global flag is set',
            function(done) {
          Post.find({where: {content: {regexp: /^a/g}}}, function(err, posts) {
            console.warn.calledOnce.should.be.ok;
            done();
          });
        });
      });
    });

    context('with regex object', function() {
      context('using no flags', function() {
        it('should work', function(done) {
          Post.find({where: {content: {regexp: new RegExp(/^A/)}}}, function(err, posts) {
            should.not.exist(err);
            posts.length.should.equal(1);
            posts[0].content.should.equal('AAA');
            done();
          });
        });
      });


      context('using flags', function() {
        beforeEach(function addSpy() {
          sinon.stub(console, 'warn');
        });
        afterEach(function removeSpy() {
          console.warn.restore();
        });

        it('should work', function(done) {
          Post.find({where: {content: {regexp: new RegExp(/^a/i)}}}, function(err, posts) {
            should.not.exist(err);
            posts.length.should.equal(1);
            posts[0].content.should.equal('AAA');
            done();
          });
        });

        it('should print a warning when the global flag is set',
            function(done) {
          Post.find({where: {content: {regexp: new RegExp(/^a/g)}}}, function(err, posts) {
            console.warn.calledOnce.should.be.ok;
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
