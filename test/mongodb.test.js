// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

// This test written in mocha+should.js
const semver = require('semver');
const should = require('./init.js');
const testUtils = require('../lib/test-utils');
const async = require('async');
const sinon = require('sinon');
const sanitizeFilter = require('../lib/mongodb').sanitizeFilter;

const GeoPoint = require('loopback-datasource-juggler').GeoPoint;

let Superhero,
  User,
  Post,
  Product,
  PostWithStringId,
  db,
  PostWithObjectId,
  PostWithNumberUnderscoreId,
  PostWithNumberId,
  Category,
  UserWithRenamedColumns,
  PostWithStringIdAndRenamedColumns,
  Employee,
  PostWithDisableDefaultSort,
  WithEmbeddedProperties,
  WithEmbeddedBinaryProperties;

describe('connect', function() {
  it('should skip connect phase (lazyConnect = true)', function(done) {
    const ds = global.getDataSource({
      host: '127.0.0.1',
      port: 4,
      lazyConnect: true,
    });
    const errTimeout = setTimeout(function() {
      done();
    }, 2000);

    ds.on('error', function(err) {
      clearTimeout(errTimeout);
      done(err);
    });
  });

  it('should report connection error (lazyConnect = false)', function(done) {
    const ds = global.getDataSource({
      host: '127.0.0.1',
      port: 4,
      lazyConnect: false,
      serverSelectionTimeoutMS: 1000,
    });

    ds.on('error', function(err) {
      should.exist(err);
      err.name.should.equalOneOf('MongoNetworkError', 'MongoTimeoutError');
      err.message.should.match(/Server selection timed out/);
      done();
    });
  });

  it('should report url parsing error', function(done) {
    const ds = global.getDataSource({
      url: 'mongodb://xyz:@127.0.0.1:4/xyz_dev_db',
      serverSelectionTimeoutMS: 1000,
    });

    ds.on('error', function(err) {
      should.exist(err);
      err.name.should.equalOneOf('MongoNetworkError', 'MongoTimeoutError');
      err.message.should.match(/Server selection timed out/);
      done();
    });
  });

  it('should connect on execute (lazyConnect = true)', function(done) {
    const ds = global.getDataSource({
      host: '127.0.0.1',
      port: global.config.port,
      lazyConnect: true,
    });

    ds.define('TestLazy', {
      value: {type: String},
    });

    ds.connector.execute(
      'TestLazy',
      'insertOne',
      {value: 'test value'},
      function(err, success) {
        if (err) {
          done(err);
        } else {
          done();
        }
      },
    );
  });

  it('should reconnect on execute when disconnected (lazyConnect = true)', function(done) {
    const ds = global.getDataSource({
      host: '127.0.0.1',
      port: global.config.port,
      lazyConnect: true,
    });

    ds.define('TestLazy', {
      value: {type: String},
    });

    ds.connector.should.not.have.property('db');

    ds.connector.execute(
      'TestLazy',
      'insertOne',
      {value: 'test value'},
      function(err, success) {
        if (err) return done(err);
        const id = success.insertedId;
        ds.connector.should.have.property('db');
        ds.connector.db.should.have.property('topology');
        ds.connector.db.topology.should.have.property('isDestroyed');
        ds.connector.db.topology.isDestroyed().should.be.False();
        ds.connector.disconnect(function(err) {
          if (err) return done(err);
          // [NOTE] isDestroyed() is not implemented by NativeTopology
          // When useUnifiedTopology is true
          // ds.connector.db.topology.isDestroyed().should.be.True();
          ds.connector.execute('TestLazy', 'findOne', {_id: id}, function(
            err,
            data,
          ) {
            if (err) return done(err);
            // ds.connector.db.topology.isDestroyed().should.be.False();
            done();
          });
        });
      },
    );
  });
});

describe('mongodb connector', function() {
  before(function() {
    db = global.getDataSource();

    User = db.define(
      'User',
      {
        name: {type: String, index: true},
        email: {type: String, index: true, unique: true},
        age: Number,
        icon: Buffer,
      },
      {
        indexes: {
          /* eslint-disable camelcase */
          name_age_index: {
            keys: {name: 1, age: -1},
          }, // The value contains keys and optinally options
          age_index: {age: -1}, // The value itself is for keys
          /* eslint-enable camelcase */
        },
      },
    );

    UserWithRenamedColumns = db.define(
      'UserWithRenamedColumns',
      {
        renamedName: {type: String, index: true, mongodb: {column: 'name'}},
        renamedEmail: {
          type: String,
          index: true,
          unique: true,
          mongodb: {field: 'email'},
        },
        age: Number,
        icon: Buffer,
      },
      {
        mongodb: {
          collection: 'User', // Overlay on the User collection
        },
      },
    );

    Superhero = db.define(
      'Superhero',
      {
        name: {type: String, index: true},
        power: {type: String, index: true, unique: true},
        address: {
          type: String,
          required: false,
          index: {mongodb: {unique: false, sparse: true}},
        },
        description: {type: String, required: false},
        location: {type: Object, required: false},
        age: Number,
        icon: Buffer,
      },
      {
        mongodb: {
          collection: 'sh',
        },
        indexes: {
          // eslint-disable-next-line
          geojson_location_geometry: {
            'location.geometry': '2dsphere',
          },
        },
      },
    );

    Post = db.define(
      'Post',
      {
        title: {type: String, length: 255, index: true},
        content: {type: String},
        comments: [String],
      },
      {
        mongodb: {
          collection: 'PostCollection', // Customize the collection name
        },
        forceId: false,
      },
    );

    Product = db.define(
      'Product',
      {
        name: {type: String, length: 255, index: true},
        description: {type: String},
        price: {type: Number},
        pricehistory: {type: Object},
      },
      {
        mongodb: {
          collection: 'ProductCollection', // Customize the collection name
        },
        forceId: false,
      },
    );

    PostWithStringId = db.define('PostWithStringId', {
      id: {type: String, id: true},
      title: {type: String, length: 255, index: true},
      content: {type: String},
    });

    PostWithObjectId = db.define('PostWithObjectId', {
      _id: {type: db.ObjectID, id: true},
      title: {type: String, length: 255, index: true},
      content: {type: String},
    });

    PostWithNumberUnderscoreId = db.define('PostWithNumberUnderscoreId', {
      _id: {type: Number, id: true},
      title: {type: String, length: 255, index: true},
      content: {type: String},
    });

    PostWithNumberId = db.define('PostWithNumberId', {
      id: {type: Number, id: true},
      title: {type: String, length: 255, index: true},
      content: {type: String},
    });

    Category = db.define('Category', {
      title: {type: String, length: 255, index: true},
      posts: {type: [db.ObjectID], index: true},
    }, {
      indexes: {
        'title_case_insensitive': {
          keys: {title: 1},
          options: {collation: {locale: 'en', strength: 1}},
        },
      },
    });

    PostWithStringIdAndRenamedColumns = db.define(
      'PostWithStringIdAndRenamedColumns',
      {
        id: {type: String, id: true},
        renamedTitle: {
          type: String,
          length: 255,
          index: true,
          mongodb: {fieldName: 'title'},
        },
        renamedContent: {type: String, mongodb: {columnName: 'content'}},
      },
      {
        mongodb: {
          collection: 'PostWithStringId', // Overlay on the PostWithStringId collection
        },
      },
    );

    PostWithDisableDefaultSort = db.define(
      'PostWithDisableDefaultSort',
      {
        id: {type: String, id: true},
        title: {type: String, length: 255, index: true},
        content: {type: String},
      },
      {
        disableDefaultSort: true,
      },
    );

    WithEmbeddedProperties = db.define(
      'WithEmbeddedProperties',
      {
        id: {type: String, id: true},
        name: {type: String},
        location: {
          type: {
            city: {type: String},
            country: {type: String},
          },
        },
      },
    );

    WithEmbeddedBinaryProperties = db.define(
      'WithEmbeddedBinaryProperties',
      {
        name: {type: String},
        image: {
          type: {
            label: String,
            rawImg: Buffer,
          },
        },
      },
    );

    User.hasMany(Post);
    Post.belongsTo(User);
  });

  beforeEach(function(done) {
    User.settings.mongodb = {};
    User.destroyAll(function() {
      Post.destroyAll(function() {
        PostWithObjectId.destroyAll(function() {
          PostWithNumberId.destroyAll(function() {
            PostWithNumberUnderscoreId.destroyAll(function() {
              PostWithStringId.destroyAll(function() {
                PostWithDisableDefaultSort.destroyAll(function() {
                  Category.destroyAll(function() {
                    WithEmbeddedProperties.destroyAll(function() {
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

  describe('.ping(cb)', function() {
    it('should return true for valid connection', function(done) {
      db.ping(done);
    });

    it('should report connection errors with invalid config', function(done) {
      const ds = global.getDataSource({
        host: 'localhost',
        port: 4, // unassigned by IANA
        serverSelectionTimeoutMS: 1000,
      });
      ds.ping(function(err) {
        should.exist(err);
        err.name.should.equalOneOf('MongoNetworkError', 'MongoTimeoutError');
        err.message.should.match(/Server selection timed out/);
        done();
      });
    });

    it('ignores invalid option', function(done) {
      const configWithInvalidOption = Object.assign({}, global.config, {
        invalidOption: 'invalid',
      });
      const ds = global.getDataSource(configWithInvalidOption);
      ds.ping(function(err) {
        if (err) return done(err);
        ds.disconnect(done);
      });
    });

    it('accepts database from the url', function(done) {
      const cfg = JSON.parse(JSON.stringify(global.config));
      delete cfg.database;
      const ds = global.getDataSource(cfg);
      ds.ping(function(err) {
        if (err) return done(err);
        ds.disconnect(done);
      });
    });

    it('should prioritize to the database given in the url property', function(done) {
      const cfg = JSON.parse(JSON.stringify(global.config));
      const testDb = 'lb-ds-overriden-test-1';
      cfg.url = 'mongodb://' + cfg.host + ':' + cfg.port + '/' + testDb;
      const ds = global.getDataSource(cfg);
      ds.once('connected', function() {
        const db = ds.connector.db;
        let validationError = null;
        try {
          db.should.have.property('databaseName', testDb); // check the db name in the db instance
        } catch (err) {
          // async error
          validationError = err;
        }
        ds.ping(function(err) {
          if (err && !validationError) validationError = err;
          ds.disconnect(function(disconnectError) {
            if (disconnectError && !validationError)
              validationError = disconnectError;
            done(validationError);
          });
        });
      });
    });
  });

  describe('order filters', function() {
    const data = [
      {
        id: 1,
        title: 'Senior Software Developer',
        name: 'Foo',
        contact: 'foo@foo.com',
      },
      {
        id: 3,
        title: 'Lead Developer',
        name: 'Baz',
        contact: 'baz@baz.com',
      },
      {
        id: 5,
        title: 'Senior Architect',
        name: 'Bar',
        contact: 'bar@bar.com',
      },
    ];
    before(function(done) {
      db = global.getDataSource();

      Employee = db.define('Employee', {
        id: {type: Number, id: true},
        title: {type: String, length: 255},
        name: {type: String},
        contact: {type: String},
      });

      db.automigrate(function(err) {
        should.not.exist(err);
        Employee.create(data, done);
      });
    });

    after(function(done) {
      Employee.destroyAll(done);
    });

    context('using buildSort directly', function() {
      it('sort in descending order', function(done) {
        const sort = db.connector.buildSort('Employee', 'id DESC');
        sort.should.have.property('_id');
        sort._id.should.equal(-1);
        done();
      });
      it('sort in ascending order', function(done) {
        const sort = db.connector.buildSort('Employee', 'id ASC');
        sort.should.have.property('_id');
        sort._id.should.equal(1);
        done();
      });
    });

    context('using all with order filter', function() {
      it('find instances in descending order', function(done) {
        Employee.all({order: 'id DESC'}, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result.length.should.equal(data.length);
          result[0].toObject().should.deepEqual(data[2]);
          result[1].toObject().should.deepEqual(data[1]);
          result[2].toObject().should.deepEqual(data[0]);
          done();
        });
      });
      it('find instances in ascending order', function(done) {
        Employee.all({order: 'id ASC'}, function(err, result) {
          should.not.exist(err);
          should.exist(result);
          result.length.should.equal(data.length);
          result[0].toObject().should.deepEqual(data[0]);
          result[1].toObject().should.deepEqual(data[1]);
          result[2].toObject().should.deepEqual(data[2]);
          done();
        });
      });
    });
  });

  it('should create indexes', function(done) {
    db.automigrate('User', function() {
      db.connector.db
        .collection('User')
        .indexInformation(function(err, result) {
          /* eslint-disable camelcase */
          const indexes = {
            _id_: [['_id', 1]],
            name_age_index: [['name', 1], ['age', -1]],
            age_index: [['age', -1]],
            name_1: [['name', 1]],
            email_1: [['email', 1]],
          };
          /* eslint-enable camelcase */
          indexes.should.eql(result);
          done(err, result);
        });
    });
  });

  it('should create complex indexes', function(done) {
    db.automigrate('Superhero', function() {
      db.connector.db.collection('sh').indexInformation(function(err, result) {
        /* eslint-disable camelcase */
        const indexes = {
          _id_: [['_id', 1]],
          geojson_location_geometry: [['location.geometry', '2dsphere']],
          power_1: [['power', 1]],
          name_1: [['name', 1]],
          address_1: [['address', 1]],
        };
        /* eslint-enable camelcase */

        indexes.should.eql(result);
        done(err, result);
      });
    });
  });

  it('should create case insensitive indexes', function(done) {
    db.automigrate('Category', function() {
      db.connector.db.collection('Category').indexes(function(err, result) {
        if (err) return done(err);
        const indexes = [
          {name: '_id_', key: {_id: 1}},
          {name: 'title_1', key: {title: 1}},
          {name: 'title_case_insensitive', key: {title: 1}, collation: {locale: 'en', strength: 1}},
          {name: 'posts_1', key: {posts: 1}},
        ];

        result.should.containDeep(indexes);
        done();
      });
    });
  });

  it('should have created models with correct _id types', function(done) {
    PostWithObjectId.definition.properties._id.type.should.be.equal(
      db.ObjectID,
    );
    should.not.exist(PostWithObjectId.definition.properties.id);
    PostWithNumberUnderscoreId.definition.properties._id.type.should.be.equal(
      Number,
    );
    should.not.exist(PostWithNumberUnderscoreId.definition.properties.id);

    done();
  });

  it('should handle correctly type Number for id field _id', function(done) {
    PostWithNumberUnderscoreId.create({_id: 3, content: 'test'}, function(
      err,
      person,
    ) {
      should.not.exist(err);
      person._id.should.be.equal(3);

      PostWithNumberUnderscoreId.findById(person._id, function(err, p) {
        should.not.exist(err);
        p.content.should.be.equal('test');

        done();
      });
    });
  });

  it('should handle correctly type Number for id field _id using string', function(done) {
    PostWithNumberUnderscoreId.create({_id: 4, content: 'test'}, function(
      err,
      person,
    ) {
      should.not.exist(err);
      person._id.should.be.equal(4);

      PostWithNumberUnderscoreId.findById('4', function(err, p) {
        should.not.exist(err);
        p.content.should.be.equal('test');

        done();
      });
    });
  });

  it('should allow to find post by id string if `_id` is defined id', function(done) {
    PostWithObjectId.create(function(err, post) {
      PostWithObjectId.find({where: {_id: post._id.toString()}}, function(
        err,
        p,
      ) {
        should.not.exist(err);
        post = p[0];
        should.exist(post);
        post._id.should.be.an.instanceOf(db.ObjectID);

        done();
      });
    });
  });

  it('find with `_id` as defined id should return an object with _id instanceof ObjectID', function(done) {
    PostWithObjectId.create(function(err, post) {
      PostWithObjectId.findById(post._id, function(err, post) {
        should.not.exist(err);
        post._id.should.be.an.instanceOf(db.ObjectID);

        done();
      });
    });
  });

  it('should update the instance with `_id` as defined id', function(done) {
    PostWithObjectId.create({title: 'a', content: 'AAA'}, function(
      err,
      post,
    ) {
      post.title = 'b';
      PostWithObjectId.updateOrCreate(post, function(err, p) {
        should.not.exist(err);
        p._id.should.be.equal(post._id);

        PostWithObjectId.findById(post._id, function(err, p) {
          should.not.exist(err);
          p._id.should.be.eql(post._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('b');
        });

        PostWithObjectId.find({where: {title: 'b'}}, function(err, posts) {
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

  it('all should return object (with `_id` as defined id) with an _id instanceof ObjectID', function(done) {
    const post = new PostWithObjectId({title: 'a', content: 'AAA'});
    post.save(function(err, post) {
      PostWithObjectId.all({where: {title: 'a'}}, function(err, posts) {
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

  it('all return should honor filter.fields, with `_id` as defined id', function(done) {
    const post = new PostWithObjectId({title: 'a', content: 'AAA'});
    post.save(function(err, post) {
      PostWithObjectId.all(
        {fields: ['title'], where: {title: 'a'}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.lengthOf(1);
          post = posts[0];
          post.should.have.property('title', 'a');
          post.should.have.property('content', undefined);
          should.not.exist(post._id);

          done();
        },
      );
    });
  });

  it('all return should honor filter.fields with `_id` selected', function(done) {
    const post = new PostWithObjectId({title: 'a', content: 'AAA'});
    post.save(function(err, post) {
      PostWithObjectId.all(
        {fields: ['_id', 'content'], where: {title: 'a'}},
        function(err, posts) {
          should.not.exist(err);
          if (err) return done(err);
          posts.should.have.lengthOf(1);
          post = posts[0];
          should.not.exist(post.title);
          post.should.have.property('content', 'AAA');
          post._id.should.be.an.instanceOf(db.ObjectID);

          done();
        },
      );
    });
  });

  it('should support Buffer type', function(done) {
    User.create({name: 'John', icon: new Buffer('1a2')}, function(e, u) {
      User.findById(u.id, function(e, user) {
        user.icon.should.be.an.instanceOf(Buffer);
        done();
      });
    });
  });

  it('should properly retrieve embedded model properties', function(done) {
    const data = {name: 'Mitsos', location: {city: 'Volos', country: 'Greece'}};
    WithEmbeddedProperties.create(data, function(err, createdModel) {
      if (err) return done(err);
      WithEmbeddedProperties.findById(createdModel.id, function(err, dbModel) {
        if (err) return done(err);
        const modelObj = dbModel.toJSON();
        const dataObj = Object.assign({id: modelObj.id}, data);
        modelObj.should.be.eql(dataObj);
        done();
      });
    });
  });

  it('should not present missing embedded model properties as null', function(done) {
    const data = {name: 'Mitsos'};
    WithEmbeddedProperties.create(data, function(err, createdModel) {
      if (err) return done(err);
      WithEmbeddedProperties.findById(createdModel.id, function(err, dbModel) {
        if (err) return done(err);
        const modelObj = dbModel.toJSON();
        const dataObj = Object.assign({}, data, {id: modelObj.id, location: undefined});
        modelObj.should.be.eql(dataObj);
        done();
      });
    });
  });

  it('should convert embedded model binary properties to buffer correctly', function(done) {
    const entity = {
      name: 'Rigas',
      image: {label: 'paris 2016', rawImg: Buffer.from([255, 216, 255, 224])},
    };
    WithEmbeddedBinaryProperties.create(entity, function(e, r) {
      WithEmbeddedBinaryProperties.findById(r.id, function(e, post) {
        post.image.rawImg.should.be.eql(Buffer.from([255, 216, 255, 224]));
        done();
      });
    });
  });

  it('hasMany should support additional conditions', function(done) {
    User.create(function(e, u) {
      u.posts.create({}, function(e, p) {
        u.posts({where: {id: p.id}}, function(err, posts) {
          should.not.exist(err);
          posts.should.have.lengthOf(1);

          done();
        });
      });
    });
  });

  it('create should return id field but not mongodb _id', function(done) {
    Post.create({title: 'Post1', content: 'Post content'}, function(
      err,
      post,
    ) {
      // console.log('create should', err, post);
      should.not.exist(err);
      should.exist(post.id);
      should.not.exist(post._id);

      done();
    });
  });

  it('should allow to find by id string', function(done) {
    Post.create({title: 'Post1', content: 'Post content'}, function(
      err,
      post,
    ) {
      Post.findById(post.id.toString(), function(err, p) {
        should.not.exist(err);
        should.exist(p);
        done();
      });
    });
  });

  it('should allow custom collection name', function(done) {
    Post.create({title: 'Post1', content: 'Post content'}, function(
      err,
      post,
    ) {
      Post.dataSource.connector.db
        .collection('PostCollection')
        .findOne({_id: post.id}, function(err, p) {
          should.not.exist(err);
          should.exist(p);
          done();
        });
    });
  });

  it('should allow to find by id using where', function(done) {
    Post.create({title: 'Post1', content: 'Post1 content'}, function(
      err,
      p1,
    ) {
      Post.create({title: 'Post2', content: 'Post2 content'}, function(
        err,
        p2,
      ) {
        Post.find({where: {id: p1.id}}, function(err, p) {
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

  it('should return data for nested `$where` in where', function(done) {
    Post.create({title: 'Post1', content: 'Post1 content'}, (err, p1) => {
      Post.create({title: 'Post2', content: 'Post2 content'}, (err2, p2) => {
        Post.create({title: 'Post3', content: 'Post3 data'}, (err3, p3) => {
          Post.find({where: {$where: 'function() {return this.content.contains("content")}'}}, (err, p) => {
            should.not.exist(err);
            p.length.should.be.equal(3);
            done();
          });
        });
      });
    });
  });

  it('should allow $where in where with options.disableSanitization', function(done) {
    Post.create({title: 'Post1', content: 'Post1 content'}, (err, p1) => {
      Post.create({title: 'Post2', content: 'Post2 content'}, (err2, p2) => {
        Post.create({title: 'Post3', content: 'Post3 data'}, (err3, p3) => {
          Post.find(
            {where: {$where: 'function() {return this.content.includes("content")}'}},
            {disableSanitization: true},
            (err, p) => {
              should.not.exist(err);
              p.length.should.be.equal(2);
              done();
            },
          );
        });
      });
    });
  });

  it('does not execute a nested `$where` when extended operators are allowed', function(done) {
    const nestedWhereFilter = {where: {content: {$where: 'function() {return this.content.includes("content")}'}}};
    Post.create({title: 'Post1', content: 'Post1 content'}, (err, p1) => {
      Post.create({title: 'Post2', content: 'Post2 content'}, (err2, p2) => {
        Post.create({title: 'Post3', content: 'Post3 data'}, (err3, p3) => {
          Post.find(nestedWhereFilter, {allowExtendedOperators: true}, (err, p) => {
            should.exist(err);
            err.message.should.match(/\$where/);
            done();
          });
        });
      });
    });
  });

  it('should allow to find by id using where inq', function(done) {
    Post.create({title: 'Post1', content: 'Post1 content'}, function(
      err,
      p1,
    ) {
      Post.create({title: 'Post2', content: 'Post2 content'}, function(
        err,
        p2,
      ) {
        Post.find({where: {id: {inq: [p1.id]}}}, function(err, p) {
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
    const events = [];
    const connector = Post.getDataSource().connector;
    connector.observe('before execute', function(ctx, next) {
      ctx.req.command.should.be.String();
      ctx.req.params.should.be.Array();
      events.push('before execute ' + ctx.req.command);
      next();
    });
    connector.observe('after execute', function(ctx, next) {
      ctx.res.should.be.Object();
      events.push('after execute ' + ctx.req.command);
      next();
    });
    Post.create({title: 'Post1', content: 'Post1 content'}, function(
      err,
      p1,
    ) {
      Post.find(function(err, results) {
        events.should.eql([
          'before execute insert',
          'after execute insert',
          'before execute find',
          'after execute find',
        ]);
        connector.clearObservers('before execute');
        connector.clearObservers('after execute');
        done(err, results);
      });
    });
  });

  it('should allow to find by number id using where', function(done) {
    PostWithNumberId.create(
      {id: 1, title: 'Post1', content: 'Post1 content'},
      function(err, p1) {
        PostWithNumberId.create(
          {id: 2, title: 'Post2', content: 'Post2 content'},
          function(err, p2) {
            PostWithNumberId.find({where: {id: p1.id}}, function(err, p) {
              should.not.exist(err);
              should.exist(p && p[0]);
              p.length.should.be.equal(1);
              p[0].id.should.be.eql(p1.id);
              done();
            });
          },
        );
      },
    );
  });

  it('should allow to find by number id using where inq', function(done) {
    PostWithNumberId.create(
      {id: 1, title: 'Post1', content: 'Post1 content'},
      function(err, p1) {
        PostWithNumberId.create(
          {id: 2, title: 'Post2', content: 'Post2 content'},
          function(err, p2) {
            PostWithNumberId.find({where: {id: {inq: [1]}}}, function(
              err,
              p,
            ) {
              should.not.exist(err);
              should.exist(p && p[0]);
              p.length.should.be.equal(1);
              p[0].id.should.be.eql(p1.id);
              PostWithNumberId.find(
                {where: {id: {inq: [1, 2]}}},
                function(err, p) {
                  should.not.exist(err);
                  p.length.should.be.equal(2);
                  p[0].id.should.be.eql(p1.id);
                  p[1].id.should.be.eql(p2.id);
                  PostWithNumberId.find(
                    {where: {id: {inq: [0]}}},
                    function(err, p) {
                      should.not.exist(err);
                      p.length.should.be.equal(0);
                      done();
                    },
                  );
                },
              );
            });
          },
        );
      },
    );
  });

  it('save should not return mongodb _id', function(done) {
    Post.create({title: 'Post1', content: 'Post content'}, function(
      err,
      post,
    ) {
      post.content = 'AAA';
      post.save(function(err, p) {
        should.not.exist(err);
        should.not.exist(p._id);
        p.id.should.be.equal(post.id);
        p.content.should.be.equal('AAA');

        done();
      });
    });
  });

  it('find should return an object with an id, which is instanceof ObjectID, but not mongodb _id', function(done) {
    Post.create({title: 'Post1', content: 'Post content'}, function(
      err,
      post,
    ) {
      Post.findById(post.id, function(err, post) {
        should.not.exist(err);
        post.id.should.be.an.instanceOf(db.ObjectID);
        should.not.exist(post._id);

        done();
      });
    });
  });

  describe('updateAll', function() {
    it('should not mutate the input data object', async function() {
      const user = await User.create({name: 'Al', age: 31, email: 'al@strongloop'});
      const userId = user.id;
      const userData = user.toObject();
      userData.age = 100;

      await User.update(userData);
      userData.should.have.property('id', userId);
    });

    it('should not mutate the input model instance', async function() {
      const user = await User.create({name: 'Al', age: 31, email: 'al@strongloop'});
      const userId = user.id;
      user.age = 100;
      user.name = 'Albert';

      await User.update(user);
      user.should.have.property('id', userId);
      user.should.have.property('name', 'Albert');
    });

    it('should update the instance matching criteria', function(done) {
      User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
        err1,
        createdusers1,
      ) {
        should.not.exist(err1);
        User.create(
          {name: 'Simon', age: 32, email: 'simon@strongloop'},
          function(err2, createdusers2) {
            should.not.exist(err2);
            User.create(
              {name: 'Ray', age: 31, email: 'ray@strongloop'},
              function(err3, createdusers3) {
                should.not.exist(err3);

                User.updateAll(
                  {age: 31},
                  {company: 'strongloop.com'},
                  function(err, updatedusers) {
                    should.not.exist(err);
                    updatedusers.should.have.property('count', 2);

                    User.find({where: {age: 31}}, function(
                      err2,
                      foundusers,
                    ) {
                      should.not.exist(err2);
                      foundusers[0].company.should.be.equal('strongloop.com');
                      foundusers[1].company.should.be.equal('strongloop.com');

                      done();
                    });
                  },
                );
              },
            );
          },
        );
      });
    });

    it('should clean the data object', function(done) {
      User.dataSource.settings.allowExtendedOperators = true;

      User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
        err1,
        createdusers1,
      ) {
        should.not.exist(err1);
        User.create(
          {name: 'Simon', age: 32, email: 'simon@strongloop'},
          function(err2, createdusers2) {
            should.not.exist(err2);
            User.create(
              {name: 'Ray', age: 31, email: 'ray@strongloop'},
              function(err3, createdusers3) {
                should.not.exist(err3);
                User.updateAll({}, {age: 40, $set: {age: 39}}, function(
                  err,
                  updatedusers,
                ) {
                  should.not.exist(err);
                  updatedusers.should.have.property('count', 3);

                  User.find({where: {age: 40}}, function(err2, foundusers) {
                    should.not.exist(err2);
                    foundusers.length.should.be.equal(0);

                    User.find({where: {age: 39}}, function(
                      err3,
                      foundusers,
                    ) {
                      should.not.exist(err3);
                      foundusers.length.should.be.equal(3);

                      User.updateAll(
                        {},
                        {$set: {age: 40}, age: 39},
                        function(err, updatedusers) {
                          should.not.exist(err);
                          updatedusers.should.have.property('count', 3);
                          User.find({where: {age: 40}}, function(
                            err2,
                            foundusers,
                          ) {
                            should.not.exist(err2);
                            foundusers.length.should.be.equal(3);
                            User.find({where: {age: 39}}, function(
                              err3,
                              foundusers,
                            ) {
                              should.not.exist(err3);
                              foundusers.length.should.be.equal(0);

                              done();
                            });
                          });
                        },
                      );
                    });
                  });
                });
              },
            );
          },
        );
      });
    });

    let describeMongo26 = describe;
    if (
      process.env.MONGODB_VERSION &&
      !semver.satisfies(process.env.MONGODB_VERSION, '~2.6.0')
    ) {
      describeMongo26 = describe.skip;
    }

    describeMongo26('extended operators', function() {
      it('should use $set by default if no operator is supplied', function(done) {
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);
          User.create(
            {name: 'Simon', age: 32, email: 'simon@strongloop'},
            function(err2, createdusers2) {
              should.not.exist(err2);
              User.create(
                {name: 'Ray', age: 31, email: 'ray@strongloop'},
                function(err3, createdusers3) {
                  should.not.exist(err3);

                  User.updateAll({name: 'Simon'}, {name: 'Alex'}, function(
                    err,
                    updatedusers,
                  ) {
                    should.not.exist(err);
                    updatedusers.should.have.property('count', 1);

                    User.find({where: {name: 'Alex'}}, function(
                      err,
                      founduser,
                    ) {
                      should.not.exist(err);
                      founduser.length.should.be.equal(1);
                      founduser[0].name.should.be.equal('Alex');

                      done();
                    });
                  });
                },
              );
            },
          );
        });
      });

      it('should use $set by default if no operator is supplied (using renamed columns)', function(done) {
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);
          User.create(
            {name: 'Simon', age: 32, email: 'simon@strongloop'},
            function(err2, createdusers2) {
              should.not.exist(err2);
              User.create(
                {name: 'Ray', age: 31, email: 'ray@strongloop'},
                function(err3, createdusers3) {
                  should.not.exist(err3);

                  UserWithRenamedColumns.updateAll(
                    {name: 'Simon'},
                    {renamedName: 'Alex'},
                    function(err, updatedusers) {
                      should.not.exist(err);
                      updatedusers.should.have.property('count', 1);

                      User.find({where: {name: 'Alex'}}, function(
                        err,
                        founduser,
                      ) {
                        should.not.exist(err);
                        founduser.length.should.be.equal(1);
                        founduser[0].name.should.be.equal('Alex');

                        done();
                      });
                    },
                  );
                },
              );
            },
          );
        });
      });

      it('should be possible to enable per model settings', function(done) {
        User.dataSource.settings.allowExtendedOperators = null;
        User.settings.mongodb = {allowExtendedOperators: true};
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);

          User.updateAll(
            {name: 'Al'},
            {$rename: {name: 'firstname'}},
            function(err, updatedusers) {
              should.not.exist(err);
              updatedusers.should.have.property('count', 1);

              User.find({where: {firstname: 'Al'}}, function(
                err,
                foundusers,
              ) {
                should.not.exist(err);
                foundusers.length.should.be.equal(1);

                done();
              });
            },
          );
        });
      });

      it('should not be possible to enable per model settings when globally disabled', function(done) {
        User.dataSource.settings.allowExtendedOperators = false;
        User.settings.mongodb = {allowExtendedOperators: true};
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);

          User.updateAll(
            {name: 'Al'},
            {$rename: {name: 'firstname'}},
            function(err, updatedusers) {
              should.exist(err);
              err.name.should.equal('MongoError');
              err.errmsg.should.equal(
                'The dollar ($) prefixed ' +
                "field '$rename' in '$rename' is not valid for storage.",
              );
              done();
            },
          );
        });
      });

      it('should not be possible to use when disabled per model settings', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.settings.mongodb = {allowExtendedOperators: false};
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);

          User.updateAll(
            {name: 'Al'},
            {$rename: {name: 'firstname'}},
            function(err, updatedusers) {
              should.exist(err);
              err.name.should.equal('MongoError');
              err.errmsg.should.equal(
                'The dollar ($) prefixed ' +
                "field '$rename' in '$rename' is not valid for storage.",
              );
              done();
            },
          );
        });
      });

      it('should be possible to enable using options - even if globally disabled', function(done) {
        User.dataSource.settings.allowExtendedOperators = false;
        const options = {allowExtendedOperators: true};
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);

          User.updateAll(
            {name: 'Al'},
            {$rename: {name: 'firstname'}},
            options,
            function(err, updatedusers) {
              should.not.exist(err);
              updatedusers.should.have.property('count', 1);

              User.find({where: {firstname: 'Al'}}, function(
                err,
                foundusers,
              ) {
                should.not.exist(err);
                foundusers.length.should.be.equal(1);

                done();
              });
            },
          );
        });
      });

      it('should be possible to disable using options - even if globally disabled', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        const options = {allowExtendedOperators: false};
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);

          User.updateAll(
            {name: 'Al'},
            {$rename: {name: 'firstname'}},
            options,
            function(err, updatedusers) {
              should.exist(err);
              err.name.should.equal('MongoError');
              err.errmsg.should.equal(
                'The dollar ($) prefixed ' +
                "field '$rename' in '$rename' is not valid for storage.",
              );
              done();
            },
          );
        });
      });

      it('should be possible to use the $inc operator', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);
          User.create(
            {name: 'Simon', age: 32, email: 'simon@strongloop'},
            function(err2, createdusers2) {
              should.not.exist(err2);
              User.create(
                {name: 'Ray', age: 31, email: 'ray@strongloop'},
                function(err3, createdusers3) {
                  should.not.exist(err3);

                  User.updateAll(
                    {name: 'Ray'},
                    {$inc: {age: 2}},
                    function(err, updatedusers) {
                      should.not.exist(err);
                      updatedusers.should.have.property('count', 1);

                      User.find({where: {name: 'Ray'}}, function(
                        err,
                        foundusers,
                      ) {
                        should.not.exist(err);
                        foundusers.length.should.be.equal(1);
                        foundusers[0].age.should.be.equal(33);

                        done();
                      });
                    },
                  );
                },
              );
            },
          );
        });
      });

      it('should be possible to use the $min and $max operators', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create(
          {name: 'Simon', age: 32, email: 'simon@strongloop'},
          function(err2, createdusers2) {
            should.not.exist(err2);

            User.updateAll({name: 'Simon'}, {$max: {age: 33}}, function(
              err,
              updatedusers,
            ) {
              should.not.exist(err);
              updatedusers.should.have.property('count', 1);

              User.updateAll({name: 'Simon'}, {$min: {age: 31}}, function(
                err,
                updatedusers,
              ) {
                should.not.exist(err);
                updatedusers.should.have.property('count', 1);

                User.find({where: {name: 'Simon'}}, function(
                  err,
                  foundusers,
                ) {
                  should.not.exist(err);
                  foundusers.length.should.be.equal(1);
                  foundusers[0].age.should.be.equal(31);

                  done();
                });
              });
            });
          },
        );
      });

      it('should be possible to use the $mul operator', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {$mul: {age: 2}}, function(
            err,
            updatedusers,
          ) {
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
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);

          User.updateAll(
            {name: 'Al'},
            {$rename: {name: 'firstname'}},
            function(err, updatedusers) {
              should.not.exist(err);
              updatedusers.should.have.property('count', 1);

              User.find({where: {firstname: 'Al'}}, function(
                err,
                foundusers,
              ) {
                should.not.exist(err);
                foundusers.length.should.be.equal(1);

                done();
              });
            },
          );
        });
      });
      it('should be possible to use the $unset operator', function(done) {
        User.dataSource.settings.allowExtendedOperators = true;
        User.create({name: 'Al', age: 31, email: 'al@strongloop'}, function(
          err1,
          createdusers1,
        ) {
          should.not.exist(err1);

          User.updateAll({name: 'Al'}, {$unset: {email: ''}}, function(
            err,
            updatedusers,
          ) {
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

    it('should allow extended operators in update data for strict models', function() {
      const noteModel = db.define('noteModel', {
        title: String,
        description: String,
      }, {strict: true});
      noteModel.settings.mongodb = {allowExtendedOperators: true};
      let noteId;

      return noteModel.create({title: 'note1', description: 'grocery list'})
        .then(function(createdInstance) {
          noteId = createdInstance.id;
          return noteModel.updateAll({id: noteId}, {$set: {description: 'updated list', title: 'setTitle'}});
        })
        .then(function() {
          return noteModel.findById(noteId);
        })
        .then(function(foundNote) {
          foundNote.title.should.equal('setTitle');
          foundNote.description.should.equal('updated list');
        });
    });
  });

  it('findOrCreate should properly support field projection (on create) - object', function() {
    const query = {where: {title: 'Kopria post'}, fields: {comments: 1}};
    const newData = {title: 'Kopria post', content: 'Xazo content', comments: ['comment1', 'comment2']};
    return Post.findOrCreate(query, newData)
      .then(function(result) {
        const createdPost = result[0];
        const created = result[1];
        created.should.be.true();
        should.not.exist(createdPost.title);
        should.not.exist(createdPost.content);
        createdPost.comments.should.containDeep(['comment1', 'comment2']);
      });
  });

  it('findOrCreate should properly support field projection (on create) - array', function() {
    const query = {where: {title: 'Kopria post'}, fields: ['comments']};
    const newData = {title: 'Kopria post', content: 'Xazo content', comments: ['comment1', 'comment2']};
    return Post.findOrCreate(query, newData)
      .then(function(result) {
        const createdPost = result[0];
        const created = result[1];
        created.should.be.true();
        should.not.exist(createdPost.title);
        should.not.exist(createdPost.content);
        createdPost.comments.should.containDeep(['comment1', 'comment2']);
      });
  });

  it('findOrCreate should properly support field projection (on find) - object', function() {
    const query = {where: {title: 'Kopria post'}, fields: {comments: 1}};
    const postData = {title: 'Kopria post', content: 'Xazo content', comments: ['comment1', 'comment2']};
    return Post.create(postData)
      .then(function() { // post created
        return Post.findOrCreate(query, postData);
      })
      .then(function(result) {
        const foundPost = result[0];
        const created = result[1];
        created.should.be.false();
        should.not.exist(foundPost.title);
        should.not.exist(foundPost.content);
        foundPost.comments.should.containDeep(['comment1', 'comment2']);
      });
  });

  it('findOrCreate should properly support field projection (on find) - array', function() {
    const query = {where: {title: 'Kopria post'}, fields: ['comments']};
    const postData = {title: 'Kopria post', content: 'Xazo content', comments: ['comment1', 'comment2']};
    return Post.create(postData)
      .then(function() { // post created
        return Post.findOrCreate(query, postData);
      })
      .then(function(result) {
        const foundPost = result[0];
        const created = result[1];
        created.should.be.false();
        should.not.exist(foundPost.title);
        should.not.exist(foundPost.content);
        foundPost.comments.should.containDeep(['comment1', 'comment2']);
      });
  });

  it('updateOrCreate should update the instance', function(done) {
    Post.create({title: 'a', content: 'AAA'}, function(err, post) {
      post.title = 'b';
      Post.updateOrCreate(post, function(err, p) {
        should.not.exist(err);
        p.id.should.be.equal(post.id);
        p.content.should.be.equal(post.content);
        should.not.exist(p._id);

        Post.findById(post.id, function(err, p) {
          p.id.should.be.eql(post.id);
          should.not.exist(p._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('b');

          done();
        });
      });
    });
  });

  it('updateAttributes should update the instance', function(done) {
    Post.create({title: 'a', content: 'AAA'}, function(err, post) {
      post.updateAttributes({title: 'b'}, function(err, p) {
        should.not.exist(err);
        p.id.should.be.equal(post.id);
        p.title.should.be.equal('b');

        Post.findById(post.id, function(err, p) {
          p.id.should.be.eql(post.id);
          p.title.should.be.equal('b');

          done();
        });
      });
    });
  });

  it('updateAttributes should not throw an error when no attributes are given', function(done) {
    Post.create({title: 'a', content: 'AAA'}, function(err, post) {
      post.updateAttributes({}, function(err, p) {
        should.not.exist(err);
        p.id.should.be.equal(post.id);
        p.title.should.be.equal('a');

        done();
      });
    });
  });

  it("updateAttributes: $addToSet should append item to an Array if it doesn't already exist", function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {name: 'bread', price: 100, pricehistory: [{'2014-11-11': 90}]},
      function(err, product) {
        const newattributes = {
          $set: {description: 'goes well with butter'},
          $addToSet: {pricehistory: {'2014-12-12': 110}},
        };
        product.updateAttributes(newattributes, function(err1, inst) {
          should.not.exist(err1);

          Product.findById(product.id, function(err2, updatedproduct) {
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
      },
    );
  });

  it("updateOrCreate: $addToSet should append item to an Array if it doesn't already exist", function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {name: 'bread', price: 100, pricehistory: [{'2014-11-11': 90}]},
      function(err, product) {
        product.$set = {description: 'goes well with butter'};
        product.$addToSet = {pricehistory: {'2014-12-12': 110}};

        Product.updateOrCreate(product, function(err, updatedproduct) {
          should.not.exist(err);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
          updatedproduct.pricehistory[1]['2014-12-12'].should.be.equal(110);
          done();
        });
      },
    );
  });

  it('updateOrCreate: $addToSet should not append item to an Array if it does already exist', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {
        name: 'bread',
        price: 100,
        pricehistory: [{'2014-11-11': 90}, {'2014-10-10': 80}],
      },
      function(err, product) {
        product.$set = {description: 'goes well with butter'};
        product.$addToSet = {pricehistory: {'2014-10-10': 80}};

        Product.updateOrCreate(product, function(err, updatedproduct) {
          should.not.exist(err);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
          updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);
          done();
        });
      },
    );
  });

  it('updateAttributes: $addToSet should not append item to an Array if it does already exist', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {
        name: 'bread',
        price: 100,
        pricehistory: [{'2014-11-11': 90}, {'2014-10-10': 80}],
      },
      function(err, product) {
        const newattributes = {
          $set: {description: 'goes well with butter'},
          $addToSet: {pricehistory: {'2014-12-12': 110}},
        };
        product.updateAttributes(newattributes, function(err1, inst) {
          should.not.exist(err1);

          Product.findById(product.id, function(err2, updatedproduct) {
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
      },
    );
  });

  it('updateAttributes: $pop should remove first or last item from an Array', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {
        name: 'bread',
        price: 100,
        pricehistory: [
          {'2014-11-11': 90},
          {'2014-10-10': 80},
          {'2014-09-09': 70},
        ],
      },
      function(err, product) {
        const newattributes = {
          $set: {description: 'goes well with butter'},
          $addToSet: {pricehistory: 1},
        };
        product.updateAttributes(newattributes, function(err1, inst) {
          should.not.exist(err1);

          Product.findById(product.id, function(err2, updatedproduct) {
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
      },
    );
  });

  it('updateOrCreate: $pop should remove first or last item from an Array', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {
        name: 'bread',
        price: 100,
        pricehistory: [
          {'2014-11-11': 90},
          {'2014-10-10': 80},
          {'2014-09-09': 70},
        ],
      },
      function(err, product) {
        product.$set = {description: 'goes well with butter'};
        product.$pop = {pricehistory: 1};

        Product.updateOrCreate(product, function(err, updatedproduct) {
          should.not.exist(err);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0]['2014-11-11'].should.be.equal(90);
          updatedproduct.pricehistory[1]['2014-10-10'].should.be.equal(80);

          updatedproduct.$pop = {pricehistory: -1};
          Product.updateOrCreate(product, function(err, p) {
            should.not.exist(err);
            should.not.exist(p._id);
            updatedproduct.pricehistory[0]['2014-10-10'].should.be.equal(80);
            done();
          });
        });
      },
    );
  });

  it('updateAttributes: $pull should remove items from an Array if they match a criteria', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {name: 'bread', price: 100, pricehistory: [70, 80, 90, 100]},
      function(err, product) {
        const newattributes = {
          $set: {description: 'goes well with butter'},
          $pull: {pricehistory: {$gte: 90}},
        };
        product.updateAttributes(newattributes, function(err1, updatedproduct) {
          should.not.exist(err1);
          Product.findById(product.id, function(err2, updatedproduct) {
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
      },
    );
  });

  it('updateOrCreate: $pull should remove items from an Array if they match a criteria', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {name: 'bread', price: 100, pricehistory: [70, 80, 90, 100]},
      function(err, product) {
        product.$set = {description: 'goes well with butter'};
        product.$pull = {pricehistory: {$gte: 90}};

        Product.updateOrCreate(product, function(err, updatedproduct) {
          should.not.exist(err);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0].should.be.equal(70);
          updatedproduct.pricehistory[1].should.be.equal(80);

          done();
        });
      },
    );
  });

  it('updateAttributes: $pullAll should remove items from an Array if they match a value from a list', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {name: 'bread', price: 100, pricehistory: [70, 80, 90, 100]},
      function(err, product) {
        const newattributes = {
          $set: {description: 'goes well with butter'},
          $pullAll: {pricehistory: [80, 100]},
        };
        product.updateAttributes(newattributes, function(err1, inst) {
          should.not.exist(err1);

          Product.findById(product.id, function(err2, updatedproduct) {
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
      },
    );
  });

  it('updateOrCreate: $pullAll should remove items from an Array if they match a value from a list', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {name: 'bread', price: 100, pricehistory: [70, 80, 90, 100]},
      function(err, product) {
        product.$set = {description: 'goes well with butter'};
        product.$pullAll = {pricehistory: [80, 100]};

        Product.updateOrCreate(product, function(err, updatedproduct) {
          should.not.exist(err);
          should.not.exist(updatedproduct._id);
          updatedproduct.id.should.be.eql(product.id);
          updatedproduct.name.should.be.equal(product.name);
          updatedproduct.description.should.be.equal('goes well with butter');
          updatedproduct.pricehistory[0].should.be.equal(70);
          updatedproduct.pricehistory[1].should.be.equal(90);

          done();
        });
      },
    );
  });

  it('updateAttributes: $push should append item to an Array even if it does already exist', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {
        name: 'bread',
        price: 100,
        pricehistory: [{'2014-11-11': 90}, {'2014-10-10': 80}],
      },
      function(err, product) {
        const newattributes = {
          $set: {description: 'goes well with butter'},
          $push: {pricehistory: {'2014-10-10': 80}},
        };

        product.updateAttributes(newattributes, function(err1, inst) {
          should.not.exist(err1);

          Product.findById(product.id, function(err2, updatedproduct) {
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
      },
    );
  });

  it('updateOrCreate: $push should append item to an Array even if it does already exist', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {
        name: 'bread',
        price: 100,
        pricehistory: [{'2014-11-11': 90}, {'2014-10-10': 80}],
      },
      function(err, product) {
        product.$set = {description: 'goes well with butter'};
        product.$push = {pricehistory: {'2014-10-10': 80}};

        Product.updateOrCreate(product, function(err, updatedproduct) {
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
      },
    );
  });

  describe('replaceById', function() {
    it('should replace the object with given data', function(done) {
      Product.create({name: 'beer', price: 150}, function(err, product) {
        if (err) return done(err);
        replaceById(product.id, {name: 'milk'});
      });

      function replaceById(id, data) {
        Product.replaceById(id, data, function(err, updatedProduct) {
          if (err) return done(err);
          should.not.exist(updatedProduct._id);
          updatedProduct.name.should.be.equal('milk');
          should.exist(updatedProduct.id);
          verify(id);
        });
      }

      function verify(id) {
        Product.findById(id, function(err, data) {
          data.name.should.be.equal('milk');
          should.not.exist(data.price);
          done(err);
        });
      }
    });
  });

  describe('replaceOrCreate', function() {
    it('should create a model instance even if it already exists', function(done) {
      Product.replaceOrCreate({name: 'newFoo'}, function(
        err,
        updatedProduct,
      ) {
        if (err) return done(err);
        should.not.exist(updatedProduct._id);
        should.exist(updatedProduct.id);
        verifyData(updatedProduct.id);
      });
      function verifyData(id) {
        Product.findById(id, function(err, data) {
          data.name.should.be.equal('newFoo');
          done(err);
        });
      }
    });

    it('should replace a model instance if the passing key already exists', function(done) {
      Product.create({name: 'bread', price: 100}, function(err, product) {
        if (err) return done(err);
        replaceOrCreate({id: product.id, name: 'milk'});
      });
      function replaceOrCreate(data) {
        Product.replaceOrCreate(data, function(err, updatedProduct) {
          if (err) return done(err);
          should.not.exist(updatedProduct._id);
          updatedProduct.name.should.be.equal('milk');
          should.exist(updatedProduct.id);
          verify(data.id);
        });
      }
      function verify(id) {
        Product.findById(id, function(err, data) {
          data.name.should.be.equal('milk');
          should.not.exist(data.price);
          done(err);
        });
      }
    });

    it('should remove extraneous properties that are not defined in the model', function(done) {
      Product.create({name: 'bread', price: 100, bar: 'baz'}, function(
        err,
        product,
      ) {
        if (err) return done(err);
        replaceOrCreate({id: product.id, name: 'milk'});
      });
      function replaceOrCreate(data) {
        Product.replaceOrCreate(data, function(err, updatedProduct) {
          if (err) return done(err);
          should.not.exist(updatedProduct.bar);
          verify(data.id);
        });
      }
      function verify(id) {
        Product.findById(id, function(err, data) {
          should.not.exist(data.bar);
          done(err);
        });
      }
    });
  });

  describe('replace', function() {
    it('should replace the model instance if the provided key already exists', function(done) {
      Product.create({name: 'bread', price: 100}, function(err, product) {
        if (err) return done(err);
        replace(product, {name: 'milk'}, product.id);
      });
      function replace(product, data, id) {
        product.replaceAttributes(data, function(err, updatedProduct) {
          if (err) return done(err);
          should.not.exist(updatedProduct._id);
          updatedProduct.name.should.be.equal('milk');
          should.exist(updatedProduct.id);
          verify(id);
        });
      }
      function verify(id) {
        Product.findById(id, function(err, data) {
          data.name.should.be.equal('milk');
          should.not.exist(data.price);
          done(err);
        });
      }
    });

    it('should remove extraneous properties that are not defined in the model', function(done) {
      Product.create({name: 'bread', price: 100, bar: 'baz'}, function(
        err,
        product,
      ) {
        if (err) return done(err);
        replace(product, {name: 'milk'}, product.id);
      });
      function replace(product, data, id) {
        product.replaceAttributes(data, function(err, updatedProduct) {
          if (err) return done(err);
          should.not.exist(updatedProduct.bar);
          verify(id);
        });
      }
      function verify(id) {
        Product.findById(id, function(err, data) {
          data.name.should.be.equal('milk');
          should.not.exist(data.bar);
          done(err);
        });
      }
    });
  });

  it('updateOrCreate: should handle combination of operators and top level properties without errors', function(done) {
    Product.dataSource.settings.allowExtendedOperators = true;
    Product.create(
      {
        name: 'bread',
        price: 100,
        ingredients: ['flour'],
        pricehistory: [{'2014-11-11': 90}, {'2014-10-10': 80}],
      },
      function(err, product) {
        product.$set = {description: 'goes well with butter'};
        product.$push = {ingredients: 'water'};
        product.$addToSet = {pricehistory: {'2014-09-09': 70}};
        product.description = 'alternative description';
        Product.updateOrCreate(product, function(err, updatedproduct) {
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
      },
    );
  });

  it('updateOrCreate should update the instance without removing existing properties', function(done) {
    Post.create(
      {title: 'a', content: 'AAA', comments: ['Comment1']},
      function(err, post) {
        post = post.toObject();
        delete post.title;
        delete post.comments;
        Post.updateOrCreate(post, function(err, p) {
          should.not.exist(err);
          p.id.should.be.equal(post.id);
          p.content.should.be.equal(post.content);
          should.not.exist(p._id);

          Post.findById(post.id, function(err, p) {
            p.id.should.be.eql(post.id);
            should.not.exist(p._id);
            p.content.should.be.equal(post.content);
            p.title.should.be.equal('a');
            p.comments[0].should.be.equal('Comment1');

            done();
          });
        });
      },
    );
  });

  it('updateOrCreate should create a new instance if it does not exist', function(done) {
    const post = {id: '123', title: 'a', content: 'AAA'};
    Post.updateOrCreate(post, function(err, p) {
      should.not.exist(err);
      p.title.should.be.equal(post.title);
      p.content.should.be.equal(post.content);
      p.id.should.be.eql(post.id);

      Post.findById(p.id, function(err, p) {
        p.id.should.be.equal(post.id);
        should.not.exist(p._id);
        p.content.should.be.equal(post.content);
        p.title.should.be.equal(post.title);
        p.id.should.be.equal(post.id);

        done();
      });
    });
  });

  it('save should update the instance with the same id', function(done) {
    Post.create({title: 'a', content: 'AAA'}, function(err, post) {
      post.title = 'b';
      post.save(function(err, p) {
        should.not.exist(err);
        p.id.should.be.equal(post.id);
        p.content.should.be.equal(post.content);
        should.not.exist(p._id);

        Post.findById(post.id, function(err, p) {
          p.id.should.be.eql(post.id);
          should.not.exist(p._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('b');

          done();
        });
      });
    });
  });

  it('save should update the instance without removing existing properties', function(done) {
    Post.create({title: 'a', content: 'AAA'}, function(err, post) {
      delete post.title;
      post.save(function(err, p) {
        should.not.exist(err);
        p.id.should.be.equal(post.id);
        p.content.should.be.equal(post.content);
        should.not.exist(p._id);

        Post.findById(post.id, function(err, p) {
          p.id.should.be.eql(post.id);
          should.not.exist(p._id);
          p.content.should.be.equal(post.content);
          p.title.should.be.equal('a');

          done();
        });
      });
    });
  });

  it('save should create a new instance if it does not exist', function(done) {
    const post = new Post({id: '123', title: 'a', content: 'AAA'});
    post.save(post, function(err, p) {
      should.not.exist(err);
      p.title.should.be.equal(post.title);
      p.content.should.be.equal(post.content);
      p.id.should.be.equal(post.id);

      Post.findById(p.id, function(err, p) {
        p.id.should.be.equal(post.id);
        should.not.exist(p._id);
        p.content.should.be.equal(post.content);
        p.title.should.be.equal(post.title);
        p.id.should.be.equal(post.id);

        done();
      });
    });
  });
  it('all should return object with an id, which is instanceof ObjectID, but not mongodb _id', function(done) {
    const post = new Post({title: 'a', content: 'AAA'});
    post.save(function(err, post) {
      Post.all({where: {title: 'a'}}, function(err, posts) {
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

  it('all return should honor filter.fields', function(done) {
    const post = new Post({title: 'b', content: 'BBB'});
    post.save(function(err, post) {
      db.connector.all(
        'Post',
        {fields: ['title'], where: {title: 'b'}},
        {},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.lengthOf(1);
          post = posts[0];
          post.should.have.property('title', 'b');
          should.not.exist(post.content);
          should.not.exist(post._id);
          should.not.exist(post.id);

          done();
        },
      );
    });
  });

  it('create should convert id from ObjectID to string', function(done) {
    const oid = new db.ObjectID();
    const sid = oid.toString();
    PostWithStringId.create({id: oid, title: 'c', content: 'CCC'}, function(
      err,
      post,
    ) {
      PostWithStringId.findById(oid, function(err, post) {
        should.not.exist(err);
        should.not.exist(post._id);
        post.id.should.be.a.String();
        post.id.should.be.equal(sid);

        done();
      });
    });
  });

  it('create should convert id from string to ObjectID', function(done) {
    const oid = new db.ObjectID();
    const sid = oid.toString();
    Post.create({id: sid, title: 'c', content: 'CCC'}, function(err, post) {
      post.id.should.be.an.instanceOf(db.ObjectID);
      Post.findById(sid, function(err, post) {
        should.not.exist(err);
        should.not.exist(post._id);
        post.id.should.be.an.instanceOf(db.ObjectID);
        post.id.should.be.eql(oid);

        done();
      });
    });
  });

  it('create should convert id from string to ObjectID - Array property', function(done) {
    Post.create({title: 'c', content: 'CCC'}, function(err, post) {
      Category.create({title: 'a', posts: [String(post.id)]}, function(
        err,
        category,
      ) {
        category.id.should.be.an.instanceOf(db.ObjectID);
        category.posts[0].should.be.an.instanceOf(db.ObjectID);
        Category.findOne({where: {posts: post.id}}, function(err, c) {
          should.not.exist(err);
          c.id.should.be.an.instanceOf(db.ObjectID);
          c.posts[0].should.be.an.instanceOf(db.ObjectID);
          c.id.should.be.eql(category.id);

          done();
        });
      });
    });
  });

  it('create should support renamed column names (using property syntax first)', function(done) {
    const oid = new db.ObjectID().toString();
    PostWithStringId.create({id: oid, title: 'c', content: 'CCC'}, function(
      err,
      post,
    ) {
      PostWithStringIdAndRenamedColumns.findById(oid, function(err, post) {
        should.not.exist(err);
        should.not.exist(post._id);
        post.id.should.be.equal(oid);

        should.exist(post.renamedTitle);
        should.exist(post.renamedContent);
        post.renamedTitle.should.be.equal('c');
        post.renamedContent.should.be.equal('CCC');

        done();
      });
    });
  });

  it('create should support renamed column names (using db syntax first)', function(done) {
    const oid = new db.ObjectID().toString();
    PostWithStringIdAndRenamedColumns.create(
      {
        id: oid,
        renamedTitle: 'c',
        renamedContent: 'CCC',
      },
      function(err, post) {
        PostWithStringId.findById(oid, function(err, post) {
          should.not.exist(err);
          should.not.exist(post._id);
          post.id.should.be.equal(oid);

          should.exist(post.title);
          should.exist(post.content);
          post.title.should.be.equal('c');
          post.content.should.be.equal('CCC');

          done();
        });
      },
    );
  });

  describe('geo queries', function() {
    let geoDb, PostWithLocation, createLocationPost;

    before(function() {
      const config = JSON.parse(JSON.stringify(global.config)); // clone config
      config.enableGeoIndexing = true;

      geoDb = global.getDataSource(config);

      PostWithLocation = geoDb.define('PostWithLocation', {
        _id: {type: geoDb.ObjectID, id: true},
        location: {type: GeoPoint, index: true},
      });
      createLocationPost = function(far) {
        let point;
        if (far) {
          point = new GeoPoint({
            lat: 31.230416,
            lng: 121.473701,
          });
        } else {
          point = new GeoPoint({
            lat: 30.27167 + Math.random() * 0.01,
            lng: 120.13469600000008 + Math.random() * 0.01,
          });
        }
        return function(callback) {
          PostWithLocation.create({location: point}, callback);
        };
      };
    });

    beforeEach(function(done) {
      PostWithLocation.destroyAll(done);
    });

    it('create should convert geopoint to geojson', function(done) {
      const point = new GeoPoint({lat: 1.243, lng: 20.4});

      PostWithLocation.create({location: point}, function(err, post) {
        should.not.exist(err);
        point.lat.should.be.equal(post.location.lat);
        point.lng.should.be.equal(post.location.lng);

        done();
      });
    });

    it('updateOrCreate should convert geopoint to geojson', function(done) {
      const point = new GeoPoint({lat: 1.243, lng: 20.4});
      const newPoint = new GeoPoint({lat: 1.2431, lng: 20.41});

      PostWithLocation.create({location: point}, function(err, post) {
        should.not.exist(err);
        point.lat.should.be.equal(post.location.lat);
        point.lng.should.be.equal(post.location.lng);

        post.location = newPoint;

        PostWithLocation.updateOrCreate(post, function(err, p) {
          should.not.exist(err);
          p._id.should.be.equal(post._id);

          PostWithLocation.findById(post._id, function(err, p2) {
            should.not.exist(err);
            p2._id.should.be.eql(post._id);
            p2.location.lat.should.be.equal(newPoint.lat);
            p2.location.lng.should.be.equal(newPoint.lng);
            done();
          });
        });
      });
    });

    it('replaceById should convert geopoint to geojson', function(done) {
      const point = new GeoPoint({lat: 1.243, lng: 20.4});
      const newPoint = new GeoPoint({lat: 1.2431, lng: 20.41});

      PostWithLocation.create({location: point}, function(err, post) {
        should.not.exist(err);
        point.lat.should.be.equal(post.location.lat);
        point.lng.should.be.equal(post.location.lng);

        post.location = newPoint;

        PostWithLocation.replaceById(post._id, post, function(err, p) {
          should.not.exist(err);
          p._id.should.be.equal(post._id);

          PostWithLocation.findById(post._id, function(err, p) {
            should.not.exist(err);
            p._id.should.be.eql(post._id);
            p.location.lat.should.be.equal(newPoint.lat);
            p.location.lng.should.be.equal(newPoint.lng);
            done();
          });
        });
      });
    });

    it('find should be able to query by location', function(done) {
      const coords = {lat: 1.25, lng: 20.2};

      geoDb.autoupdate(function(err) {
        const createPost = function(callback) {
          const point = new GeoPoint({
            lat: Math.random() * 180 - 90,
            lng: Math.random() * 360 - 180,
          });

          PostWithLocation.create({location: point}, callback);
        };

        async.parallel(
          [
            createPost.bind(null),
            createPost.bind(null),
            createPost.bind(null),
            createPost.bind(null),
          ],
          function(err) {
            should.not.exist(err);

            PostWithLocation.find(
              {
                where: {
                  location: {
                    near: new GeoPoint(coords),
                  },
                },
              },
              function(err, results) {
                should.not.exist(err);
                should.exist(results);

                let dist = 0;
                results.forEach(function(result) {
                  const currentDist = testUtils.getDistanceBetweenPoints(
                    coords,
                    result.location,
                  );
                  currentDist.should.be.aboveOrEqual(dist);
                  dist = currentDist;
                });

                done();
              },
            );
          },
        );
      });
    });

    it('find should be queryable using locations with deep/multiple keys', function(done) {
      const coords = {lat: 1.25, lng: 20.2};

      geoDb.autoupdate(function(err) {
        let heroNumber = 0;
        const powers = ['fly', 'lasers', 'strength', 'drink'];

        function createSuperheroWithLocation(callback) {
          heroNumber++;

          Superhero.create(
            {
              name: 'Hero #' + heroNumber,
              power: powers[heroNumber - 1],
              location: {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [coords.lng, coords.lat],
                },
              },
            },
            callback,
          );
        }

        async.parallel(
          [
            createSuperheroWithLocation,
            createSuperheroWithLocation,
            createSuperheroWithLocation,
          ],
          function(err) {
            if (err) return done(err);

            Superhero.find(
              {
                where: {
                  and: [
                    {
                      'location.geometry': {
                        near: [coords.lng, coords.lat],
                        maxDistance: 50,
                      },
                    },
                    {
                      power: 'strength',
                    },
                  ],
                },
              },
              function(err, results) {
                if (err) return done(err);

                results.should.have.length(1);

                let dist = 0;
                results.forEach(function(result) {
                  const currentDist = testUtils.getDistanceBetweenPoints(coords, {
                    lng: result.location.geometry.coordinates[0],
                    lat: result.location.geometry.coordinates[1],
                  });
                  currentDist.should.be.aboveOrEqual(dist);
                  dist = currentDist;
                });

                done();
              },
            );
          },
        );
      });
    });

    it('find should be able to query by location via near with maxDistance', function(done) {
      const coords = {lat: 30.274085, lng: 120.15507000000002};

      geoDb.autoupdate(function(err) {
        async.parallel(
          [
            createLocationPost(false),
            createLocationPost(false),
            createLocationPost(false),
            createLocationPost(true),
          ],
          function(err) {
            if (err) return done(err);
            PostWithLocation.find(
              {
                where: {
                  location: {
                    near: new GeoPoint(coords),
                    maxDistance: 17000,
                    unit: 'meters',
                  },
                },
              },
              function(err, results) {
                if (err) return done(err);
                results.length.should.be.equal(3);
                let dist = 0;
                results.forEach(function(result) {
                  const currentDist = testUtils.getDistanceBetweenPoints(
                    coords,
                    result.location,
                  );
                  currentDist.should.be.aboveOrEqual(dist);
                  currentDist.should.be.belowOrEqual(17);
                  dist = currentDist;
                });
                done();
              },
            );
          },
        );
      });
    });

    it('find should be able to query by location via near with minDistance set', function(done) {
      const coords = {lat: 30.274085, lng: 120.15507000000002};
      geoDb.autoupdate(function(err) {
        async.parallel(
          [
            createLocationPost(false),
            createLocationPost(false),
            createLocationPost(false),
            createLocationPost(true),
          ],
          function(err) {
            if (err) return done(err);
            PostWithLocation.find(
              {
                where: {
                  location: {
                    near: new GeoPoint(coords),
                    minDistance: 17000,
                    unit: 'meters',
                  },
                },
              },
              function(err, results) {
                if (err) return done(err);
                results.length.should.be.equal(1);
                let dist = 0;
                results.forEach(function(result) {
                  const currentDist = testUtils.getDistanceBetweenPoints(
                    coords,
                    result.location,
                  );
                  currentDist.should.be.aboveOrEqual(dist);
                  dist = currentDist;
                });
                done();
              },
            );
          },
        );
      });
    });

    it('find should be able to set unit when query location via near', function(done) {
      const coords = {lat: 30.274085, lng: 120.15507000000002};

      geoDb.autoupdate(function(err) {
        const queryLocation = function(
          distance,
          unit,
          distanceInMeter,
          numOfResult,
        ) {
          return function(callback) {
            PostWithLocation.find(
              {
                where: {
                  location: {
                    near: new GeoPoint(coords),
                    maxDistance: distance,
                    unit: unit,
                  },
                },
              },
              function(err, results) {
                if (err) return done(err);
                results.length.should.be.equal(numOfResult);
                results.forEach(function(result) {
                  const currentDist = testUtils.getDistanceBetweenPoints(
                    coords,
                    result.location,
                  );
                  currentDist.should.be.belowOrEqual(distanceInMeter / 1000);
                });
                callback();
              },
            );
          };
        };

        async.parallel(
          [
            createLocationPost(false),
            createLocationPost(false),
            createLocationPost(false),
            createLocationPost(true),
          ],
          function(err) {
            if (err) return done(err);
            async.parallel(
              [
                queryLocation(10000, undefined, 10000, 3),
                queryLocation(10, 'miles', 16000, 3),
                queryLocation(10, 'kilometers', 10000, 3),
                queryLocation(20000, 'feet', 6096, 3),
                queryLocation(10000, 'radians', 10000, 3),
                queryLocation(10000, 'degrees', 10000, 3),
              ],
              done,
            );
          },
        );
      });
    });

    afterEach(function(done) {
      PostWithLocation.destroyAll(done);
    });
  });

  it('find should order by id if the order is not set for the query filter', function(done) {
    PostWithStringId.create({id: '2', title: 'c', content: 'CCC'}, function(
      err,
      post,
    ) {
      PostWithStringId.create({id: '1', title: 'd', content: 'DDD'}, function(
        err,
        post,
      ) {
        PostWithStringId.find(function(err, posts) {
          should.not.exist(err);
          posts.length.should.be.equal(2);
          posts[0].id.should.be.equal('1');

          PostWithStringId.find({limit: 1, offset: 0}, function(err, posts) {
            should.not.exist(err);
            posts.length.should.be.equal(1);
            posts[0].id.should.be.equal('1');

            PostWithStringId.find({limit: 1, offset: 1}, function(
              err,
              posts,
            ) {
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

  it('find should not order by id if the order is not set for the query filter and settings.disableDefaultSort is true',
    function(done) {
      PostWithDisableDefaultSort.create({id: '2', title: 'c', content: 'CCC'}, function(err, post) {
        PostWithDisableDefaultSort.create({id: '1', title: 'd', content: 'DDD'}, function(err, post) {
          PostWithDisableDefaultSort.find({}, function(err, posts) {
            should.not.exist(err);
            posts.length.should.be.equal(2);
            posts[0].id.should.be.equal('2');

            PostWithDisableDefaultSort.find({limit: 1, offset: 0}, function(err, posts) {
              should.not.exist(err);
              posts.length.should.be.equal(1);
              posts[0].id.should.be.equal('2');

              PostWithDisableDefaultSort.find({limit: 1, offset: 1}, function(err, posts) {
                should.not.exist(err);
                posts.length.should.be.equal(1);
                posts[0].id.should.be.equal('1');
                done();
              });
            });
          });
        });
      });
    });

  it('should report error on duplicate keys', function(done) {
    Post.create({title: 'd', content: 'DDD'}, function(err, post) {
      Post.create({id: post.id, title: 'd', content: 'DDD'}, function(
        err,
        post,
      ) {
        should.exist(err);
        done();
      });
    });
  });

  it('should allow to find using case insensitive index', function(done) {
    Category.create({title: 'My Category'}, function(err, category1) {
      if (err) return done(err);
      Category.create({title: 'MY CATEGORY'}, function(err, category2) {
        if (err) return done(err);

        Category.find({where: {title: 'my cATEGory'}}, {collation: {locale: 'en', strength: 1}},
          function(err, categories) {
            if (err) return done(err);
            categories.should.have.length(2);
            done();
          });
      });
    });
  });

  it('should allow to find using like', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find({where: {title: {like: 'M.+st'}}}, function(err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should allow to find using case insensitive like', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find({where: {title: {like: 'm.+st', options: 'i'}}}, function(
        err,
        posts,
      ) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should allow to find using like with renamed columns', function(done) {
    PostWithStringId.create({title: 'My Post', content: 'Hello'}, function(
      err,
      post,
    ) {
      PostWithStringIdAndRenamedColumns.find(
        {where: {renamedTitle: {like: 'M.+st'}}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 1);
          done();
        },
      );
    });
  });

  it('should allow to find using like with renamed columns (inverse create order)', function(done) {
    PostWithStringIdAndRenamedColumns.create(
      {renamedTitle: 'My Post', renamedContent: 'Hello'},
      function(err, post) {
        PostWithStringId.find({where: {title: {like: 'M.+st'}}}, function(
          err,
          posts,
        ) {
          should.not.exist(err);
          posts.should.have.property('length', 1);
          done();
        });
      },
    );
  });

  it('should allow to find using case insensitive like - test 2', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find(
        {where: {content: {like: 'HELLO', options: 'i'}}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 1);
          done();
        },
      );
    });
  });

  it('should support like for no match', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find({where: {title: {like: 'M.+XY'}}}, function(err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });
  });

  it('should allow to find using nlike', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find({where: {title: {nlike: 'M.+st'}}}, function(err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });
  });

  it('should allow to find using case insensitive nlike', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find(
        {where: {title: {nlike: 'm.+st', options: 'i'}}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 0);
          done();
        },
      );
    });
  });

  it('should support nlike for no match', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find({where: {title: {nlike: 'M.+XY'}}}, function(err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should support "and" operator that is satisfied', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find(
        {where: {and: [{title: 'My Post'}, {content: 'Hello'}]}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 1);
          done();
        },
      );
    });
  });

  it('should support "and" operator that is not satisfied', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find(
        {where: {and: [{title: 'My Post'}, {content: 'Hello1'}]}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 0);
          done();
        },
      );
    });
  });

  it('should support "or" that is satisfied', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find(
        {where: {or: [{title: 'My Post'}, {content: 'Hello1'}]}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 1);
          done();
        },
      );
    });
  });

  it('should support "or" operator that is not satisfied', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find(
        {where: {or: [{title: 'My Post1'}, {content: 'Hello1'}]}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 0);
          done();
        },
      );
    });
  });

  it('should support "nor" operator that is satisfied', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find(
        {where: {nor: [{title: 'My Post1'}, {content: 'Hello1'}]}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 1);
          done();
        },
      );
    });
  });

  it('should support "nor" operator that is not satisfied', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find(
        {where: {nor: [{title: 'My Post'}, {content: 'Hello1'}]}},
        function(err, posts) {
          should.not.exist(err);
          posts.should.have.property('length', 0);
          done();
        },
      );
    });
  });

  it('should support neq for match', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find({where: {title: {neq: 'XY'}}}, function(err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 1);
        done();
      });
    });
  });

  it('should support neq for no match', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.find({where: {title: {neq: 'My Post'}}}, function(err, posts) {
        should.not.exist(err);
        posts.should.have.property('length', 0);
        done();
      });
    });
  });

  it('should support count without where', function(done) {
    const POST_NUMBER = 35;
    const posts = [];
    for (let i = 0; i < POST_NUMBER; i++) {
      posts.push({title: `My post ${i}`, content: `content ${i}`});
    }

    Post.create(posts, function() {
      Post.count(function(err, count) {
        if (err) return done(err);
        count.should.be.equal(POST_NUMBER);
        done();
      });
    });
  });

  // The where object should be parsed by the connector
  it('should support where for count', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      Post.count(
        {and: [{title: 'My Post'}, {content: 'Hello'}]},
        function(err, count) {
          should.not.exist(err);
          count.should.be.equal(1);
          Post.count(
            {and: [{title: 'My Post1'}, {content: 'Hello'}]},
            function(err, count) {
              should.not.exist(err);
              count.should.be.equal(0);
              done();
            },
          );
        },
      );
    });
  });

  // The where object should be parsed by the connector
  it('should support where for destroyAll', function(done) {
    Post.create({title: 'My Post1', content: 'Hello'}, function(err, post) {
      Post.create({title: 'My Post2', content: 'Hello'}, function(err, post) {
        Post.destroyAll(
          {
            and: [{title: 'My Post1'}, {content: 'Hello'}],
          },
          function(err) {
            should.not.exist(err);
            Post.count(function(err, count) {
              should.not.exist(err);
              count.should.be.equal(1);
              done();
            });
          },
        );
      });
    });
  });

  it(
    'should support where for count (using renamed columns in deep filter ' +
    'criteria)',
    function(done) {
      PostWithStringId.create({title: 'My Post', content: 'Hello'}, function(
        err,
        post,
      ) {
        PostWithStringIdAndRenamedColumns.count(
          {
            and: [
              {
                renamedTitle: 'My Post',
              },
              {renamedContent: 'Hello'},
            ],
          },
          function(err, count) {
            should.not.exist(err);
            count.should.be.equal(1);
            PostWithStringIdAndRenamedColumns.count(
              {
                and: [
                  {
                    renamedTitle: 'My Post1',
                  },
                  {renamedContent: 'Hello'},
                ],
              },
              function(err, count) {
                should.not.exist(err);
                count.should.be.equal(0);
                done();
              },
            );
          },
        );
      });
    },
  );

  it('should return info for destroy', function(done) {
    Post.create({title: 'My Post', content: 'Hello'}, function(err, post) {
      post.destroy(function(err, info) {
        should.not.exist(err);
        info.should.be.eql({count: 1});
        done();
      });
    });
  });

  it('should export the MongoDB function', function() {
    const module = require('../');
    module.MongoDB.should.be.an.instanceOf(Function);
  });

  it('should export the ObjectID function', function() {
    const module = require('../');
    module.ObjectID.should.be.an.instanceOf(Function);
  });

  it('should export the generateMongoDBURL function', function() {
    const module = require('../');
    module.generateMongoDBURL.should.be.an.instanceOf(Function);
  });

  describe('Test generateMongoDBURL function', function() {
    const module = require('../');
    context('should return correct mongodb url ', function() {
      it('when only passing in database', function() {
        const options = {
          database: 'fakeDatabase',
        };
        module.generateMongoDBURL(options).should.be.eql('mongodb://127.0.0.1:27017/fakeDatabase');
      });
      it('when protocol is mongodb and no username/password', function() {
        const options = {
          protocol: 'mongodb',
          hostname: 'fakeHostname',
          port: 9999,
          database: 'fakeDatabase',
        };
        module.generateMongoDBURL(options).should.be.eql('mongodb://fakeHostname:9999/fakeDatabase');
      });
      it('when protocol is mongodb and has username/password', function() {
        const options = {
          protocol: 'mongodb',
          hostname: 'fakeHostname',
          port: 9999,
          database: 'fakeDatabase',
          username: 'fakeUsername',
          password: 'fakePassword',
        };
        module.generateMongoDBURL(options).should.be.eql('mongodb://fakeUsername:fakePassword@fakeHostname:9999/fakeDatabase');
      });
      it('when protocol is mongodb+srv and no username/password', function() {
        const options = {
          protocol: 'mongodb+srv',
          hostname: 'fakeHostname',
          port: 9999,
          database: 'fakeDatabase',
        };
        // mongodb+srv url should not have the port in it
        module.generateMongoDBURL(options).should.be.eql('mongodb+srv://fakeHostname/fakeDatabase');
      });
      it('when protocol is mongodb+srv and has username/password', function() {
        const options = {
          protocol: 'mongodb+srv',
          hostname: 'fakeHostname',
          port: 9999,
          database: 'fakeDatabase',
          username: 'fakeUsername',
          password: 'fakePassword',
        };
        // mongodb+srv url should not have the port in it
        module.generateMongoDBURL(options).should.be.eql('mongodb+srv://fakeUsername:fakePassword@fakeHostname/fakeDatabase');
      });
    });
  });

  context('fieldsArrayToObj', function() {
    const fieldsArrayToObj = require('../').fieldsArrayToObj;
    it('should export the fieldsArrayToObj function', function() {
      fieldsArrayToObj.should.be.an.instanceOf(Function);
    });

    it('should return actual object if provided input is not an array', function() {
      fieldsArrayToObj({someField: 1}).should.be.eql({someField: 1});
    });

    it('should provide the single _id element when input array empty', function() {
      fieldsArrayToObj([]).should.be.eql({_id: 1});
    });

    it('should properly convert the provided array to object', function() {
      fieldsArrayToObj(['prop1', 'prop2']).should.be.eql({prop1: 1, prop2: 1});
    });
  });

  context('regexp operator', function() {
    before(function deleteExistingTestFixtures(done) {
      Post.destroyAll(done);
    });
    beforeEach(function createTestFixtures(done) {
      Post.create(
        [{title: 'a', content: 'AAA'}, {title: 'b', content: 'BBB'}],
        done,
      );
    });
    after(function deleteTestFixtures(done) {
      Post.destroyAll(done);
    });

    context('with regex strings', function() {
      context('using no flags', function() {
        it('should work', function(done) {
          Post.find({where: {content: {regexp: '^A'}}}, function(
            err,
            posts,
          ) {
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
          Post.find({where: {content: {regexp: '^a/i'}}}, function(
            err,
            posts,
          ) {
            should.not.exist(err);
            posts.length.should.equal(1);
            posts[0].content.should.equal('AAA');
            done();
          });
        });

        it('should print a warning when the global flag is set', function(done) {
          Post.find({where: {content: {regexp: '^a/g'}}}, function(
            err,
            posts,
          ) {
            // eslint-disable-next-line
            console.warn.calledOnce.should.be.ok;
            done();
          });
        });
      });
    });

    context('with regex literals', function() {
      context('using no flags', function() {
        it('should work', function(done) {
          Post.find({where: {content: {regexp: /^A/}}}, function(
            err,
            posts,
          ) {
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
          Post.find({where: {content: {regexp: /^a/i}}}, function(
            err,
            posts,
          ) {
            should.not.exist(err);
            posts.length.should.equal(1);
            posts[0].content.should.equal('AAA');
            done();
          });
        });

        it('should print a warning when the global flag is set', function(done) {
          Post.find({where: {content: {regexp: /^a/g}}}, function(
            err,
            posts,
          ) {
            // eslint-disable-next-line
            console.warn.calledOnce.should.be.ok;
            done();
          });
        });
      });
    });

    context('with regex object', function() {
      context('using no flags', function() {
        it('should work', function(done) {
          Post.find(
            {where: {content: {regexp: new RegExp(/^A/)}}},
            function(err, posts) {
              should.not.exist(err);
              posts.length.should.equal(1);
              posts[0].content.should.equal('AAA');
              done();
            },
          );
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
          Post.find(
            {where: {content: {regexp: new RegExp(/^a/i)}}},
            function(err, posts) {
              should.not.exist(err);
              posts.length.should.equal(1);
              posts[0].content.should.equal('AAA');
              done();
            },
          );
        });

        it('should print a warning when the global flag is set', function(done) {
          Post.find(
            {where: {content: {regexp: new RegExp(/^a/g)}}},
            function(err, posts) {
              // eslint-disable-next-line
              console.warn.calledOnce.should.be.ok;
              done();
            },
          );
        });
      });
    });
  });

  context('like and nlike operator', function() {
    before(function deleteExistingTestFixtures(done) {
      Post.destroyAll(done);
    });
    beforeEach(function createTestFixtures(done) {
      Post.create(
        [{title: 'a', content: 'AAA'}, {title: 'b', content: 'BBB'}],
        done,
      );
    });
    after(function deleteTestFixtures(done) {
      Post.destroyAll(done);
    });

    context('like operator', function() {
      context('with regex strings', function() {
        context('using no flags', function() {
          it('should work', function(done) {
            Post.find({where: {content: {like: '^A'}}}, function(
              err,
              posts,
            ) {
              should.not.exist(err);
              posts.length.should.equal(1);
              posts[0].content.should.equal('AAA');
              done();
            });
          });
        });

        context('using flags', function() {
          it('should work', function(done) {
            Post.find(
              {where: {content: {like: '^a', options: 'i'}}},
              function(err, posts) {
                should.not.exist(err);
                posts.length.should.equal(1);
                posts[0].content.should.equal('AAA');
                done();
              },
            );
          });
        });
      });

      context('with regex literals', function() {
        context('using no flags', function() {
          it('should work', function(done) {
            Post.find({where: {content: {like: /^A/}}}, function(
              err,
              posts,
            ) {
              should.not.exist(err);
              posts.length.should.equal(1);
              posts[0].content.should.equal('AAA');
              done();
            });
          });
        });

        context('using flags', function() {
          it('should work', function(done) {
            Post.find({where: {content: {like: /^a/i}}}, function(
              err,
              posts,
            ) {
              should.not.exist(err);
              posts.length.should.equal(1);
              posts[0].content.should.equal('AAA');
              done();
            });
          });
        });
      });

      context('with regex object', function() {
        context('using no flags', function() {
          it('should work', function(done) {
            Post.find(
              {where: {content: {like: new RegExp(/^A/)}}},
              function(err, posts) {
                should.not.exist(err);
                posts.length.should.equal(1);
                posts[0].content.should.equal('AAA');
                done();
              },
            );
          });
        });

        context('using flags', function() {
          it('should work', function(done) {
            Post.find(
              {where: {content: {like: new RegExp(/^a/i)}}},
              function(err, posts) {
                should.not.exist(err);
                posts.length.should.equal(1);
                posts[0].content.should.equal('AAA');
                done();
              },
            );
          });
        });
      });
    });

    context('nlike operator', function() {
      context('with regex strings', function() {
        context('using no flags', function() {
          it('should work', function(done) {
            Post.find({where: {content: {nlike: '^A'}}}, function(
              err,
              posts,
            ) {
              should.not.exist(err);
              posts.length.should.equal(1);
              posts[0].content.should.equal('BBB');
              done();
            });
          });
        });

        context('using flags', function() {
          it('should work', function(done) {
            Post.find(
              {where: {content: {nlike: '^a', options: 'i'}}},
              function(err, posts) {
                should.not.exist(err);
                posts.length.should.equal(1);
                posts[0].content.should.equal('BBB');
                done();
              },
            );
          });
        });
      });

      context('with regex literals', function() {
        context('using no flags', function() {
          it('should work', function(done) {
            Post.find({where: {content: {nlike: /^A/}}}, function(
              err,
              posts,
            ) {
              should.not.exist(err);
              posts.length.should.equal(1);
              posts[0].content.should.equal('BBB');
              done();
            });
          });
        });

        context('using flags', function() {
          it('should work', function(done) {
            Post.find({where: {content: {nlike: /^a/i}}}, function(
              err,
              posts,
            ) {
              should.not.exist(err);
              posts.length.should.equal(1);
              posts[0].content.should.equal('BBB');
              done();
            });
          });
        });
      });

      context('with regex object', function() {
        context('using no flags', function() {
          it('should work', function(done) {
            Post.find(
              {where: {content: {nlike: new RegExp(/^A/)}}},
              function(err, posts) {
                should.not.exist(err);
                posts.length.should.equal(1);
                posts[0].content.should.equal('BBB');
                done();
              },
            );
          });
        });

        context('using flags', function() {
          it('should work', function(done) {
            Post.find(
              {where: {content: {nlike: new RegExp(/^a/i)}}},
              function(err, posts) {
                should.not.exist(err);
                posts.length.should.equal(1);
                posts[0].content.should.equal('BBB');
                done();
              },
            );
          });
        });
      });
    });
  });

  context('sanitizeFilter()', () => {
    it('returns filter if not an object', () => {
      const input = false;
      const out = sanitizeFilter(input);
      out.should.equal(input);
    });

    it('returns the filter if options.disableSanitization is true', () => {
      const input = {key: 'value', $where: 'a value'};
      const out = sanitizeFilter(input, {disableSanitization: true});
      out.should.deepEqual(input);
    });

    it('removes `$where` property', () => {
      const input = {key: 'value', $where: 'a value'};
      const out = sanitizeFilter(input);
      out.should.deepEqual({key: 'value'});
    });

    it('does not remove properties with `$` in it', () => {
      const input = {key: 'value', $where: 'a value', random$key: 'random'};
      const out = sanitizeFilter(input);
      out.should.deepEqual({key: 'value', random$key: 'random'});
    });

    it('removes `mapReduce` property in the object', () => {
      const input = {key: 'value', random$key: 'a value', mapReduce: 'map'};
      const out = sanitizeFilter(input);
      out.should.deepEqual({key: 'value', random$key: 'a value'});
    });
  });

  after(function(done) {
    User.destroyAll(function() {
      Post.destroyAll(function() {
        PostWithObjectId.destroyAll(function() {
          PostWithNumberId.destroyAll(function() {
            PostWithNumberUnderscoreId.destroyAll(done);
          });
        });
      });
    });
  });
});
