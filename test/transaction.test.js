// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
const should = require('./init.js');
const Transaction = require('loopback-connector/lib/transaction');

const juggler = require('loopback-datasource-juggler');
let db, Post, Review;
describe.skip('transactions', function() {
  before(function(done) {
    // use run-rs -v 4.2.0 --host localhost --portStart 27000 to start replicaset for transaction testing
    db = global.getDataSource({
      url: 'mongodb://localhost:27000,localhost:27001,localhost:27002/testdb?replicaSet=rs',
      retryWrites: false,
    });
    db.once('connected', function() {
      Post = db.define('PostTX', {
        title: {type: String, length: 255, index: true},
        content: {type: String},
      });
      Review = db.define('ReviewTX', {
        author: String,
        content: {type: String},
      });
      Post.hasMany(Review, {as: 'reviews', foreignKey: 'postId'});
      db.automigrate(done);
    });
  });

  let currentTx;
  let hooks = [];
  // Return an async function to start a transaction and create a post
  function createPostInTx(post, timeout) {
    return function(done) {
      // Transaction.begin(db.connector, Transaction.READ_COMMITTED,
      Post.beginTransaction({
        isolationLevel: Transaction.READ_COMMITTED,
        timeout: timeout,
      },
      function(err, tx) {
        if (err) return done(err);
        tx.should.have.property('id').and.be.a.String();
        hooks = [];
        tx.observe('before commit', function(context, next) {
          hooks.push('before commit');
          next();
        });
        tx.observe('after commit', function(context, next) {
          hooks.push('after commit');
          next();
        });
        tx.observe('before rollback', function(context, next) {
          hooks.push('before rollback');
          next();
        });
        tx.observe('after rollback', function(context, next) {
          hooks.push('after rollback');
          next();
        });
        currentTx = tx;
        Post.create(post, {transaction: tx, model: 'Post'},
          function(err, p) {
            if (err) {
              done(err);
            } else {
              p.reviews.create({
                author: 'John',
                content: 'Review for ' + p.title,
              }, {transaction: tx, model: 'Review'},
              function(err, c) {
                done(err);
              });
            }
          });
      });
    };
  }

  // Return an async function to find matching posts and assert number of
  // records to equal to the count
  function expectToFindPosts(where, count, inTx) {
    return function(done) {
      const options = {model: 'Post'};
      if (inTx) {
        options.transaction = currentTx;
      }
      Post.find({where: where}, options,
        function(err, posts) {
          if (err) return done(err);
          posts.length.should.equal(count);
          // Make sure both find() and count() behave the same way
          Post.count(where, options,
            function(err, result) {
              if (err) return done(err);
              result.should.equal(count);
              if (count) {
                // Find related reviews
                options.model = 'Review';
                // Please note the empty {} is required, otherwise, the options
                // will be treated as a filter
                posts[0].reviews({}, options, function(err, reviews) {
                  if (err) return done(err);
                  reviews.length.should.equal(count);
                  done();
                });
              } else {
                done();
              }
            });
        });
    };
  }

  describe('commit', function() {
    const post = {title: 't1', content: 'c1'};
    before(createPostInTx(post));

    it('should not see the uncommitted insert', expectToFindPosts(post, 0));

    it('should see the uncommitted insert from the same transaction',
      expectToFindPosts(post, 1, true));

    it('should commit a transaction', function(done) {
      currentTx.commit(function(err) {
        hooks.should.eql(['before commit', 'after commit']);
        done(err);
      });
    });

    it('should see the committed insert', expectToFindPosts(post, 1));

    it('should report error if the transaction is not active', function(done) {
      currentTx.commit(function(err) {
        err.should.be.instanceof(Error);
        done();
      });
    });
  });

  describe('rollback', function() {
    before(function() {
      // Reset the collection
      db.connector.data = {};
    });

    const post = {title: 't2', content: 'c2'};
    before(createPostInTx(post));

    it('should not see the uncommitted insert', expectToFindPosts(post, 0));

    it('should see the uncommitted insert from the same transaction',
      expectToFindPosts(post, 1, true));

    it('should rollback a transaction', function(done) {
      currentTx.rollback(function(err) {
        hooks.should.eql(['before rollback', 'after rollback']);
        done(err);
      });
    });

    it('should not see the rolledback insert', expectToFindPosts(post, 0));

    it('should report error if the transaction is not active', function(done) {
      currentTx.rollback(function(err) {
        err.should.be.instanceof(Error);
        done();
      });
    });
  });

  describe('timeout', function() {
    const TIMEOUT = 50;
    before(function() {
      // Reset the collection
      db.connector.data = {};
    });

    const post = {title: 't3', content: 'c3'};
    beforeEach(createPostInTx(post, TIMEOUT));

    it('should report timeout', function(done) {
      // wait until the "create post" transaction times out
      setTimeout(runTheTest, TIMEOUT * 3);

      function runTheTest() {
        Post.find({where: {title: 't3'}}, {transaction: currentTx},
          function(err, posts) {
            err.should.match(/transaction.*not active/);
            done();
          });
      }
    });

    it('should invoke the timeout hook', function(done) {
      currentTx.observe('timeout', function(context, next) {
        next();
        done();
      });

      // If the event is not fired quickly enough, then the test can
      // quickly fail - no need to wait full two seconds (Mocha's default)
      this.timeout(TIMEOUT * 3);
    });
  });

  describe('isActive', function() {
    it('returns true when connection is active', function(done) {
      Post.beginTransaction({
        isolationLevel: Transaction.READ_COMMITTED,
        timeout: 1000,
      },
      function(err, tx) {
        if (err) return done(err);
        tx.isActive().should.equal(true);
        return done();
      });
    });
    it('returns false when connection is not active', function(done) {
      Post.beginTransaction({
        isolationLevel: Transaction.READ_COMMITTED,
        timeout: 1000,
      },
      function(err, tx) {
        if (err) return done(err);
        delete tx.connection;
        tx.isActive().should.equal(false);
        return done();
      });
    });
  });
});
