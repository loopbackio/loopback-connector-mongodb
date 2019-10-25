// Copyright IBM Corp. 2018,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

// This test written in mocha+should.js
const should = require('./init.js');

describe('connector function - findById', function() {
  let db, TestAlias, sampleId;
  before(function(done) {
    db = global.getDataSource();
    TestAlias = db.define('TestAlias', {foo: {type: String}});
    db.automigrate(function(err) {
      if (err) return done(err);
      TestAlias.create({foo: 'foo'}, function(err, t) {
        if (err) return done(err);
        sampleId = t.id;
        done();
      });
    });
  });

  it('find is aliased as findById', function(done) {
    db.connector.findById('TestAlias', sampleId, {}, function(err, r) {
      if (err) return done(err);
      r.foo.should.equal('foo');
      done();
    });
  });
});

describe('find (implicitNullType)', function() {
  let db, TestAlias, sampleId;
  let implicitNullType = false;
  beforeEach(function(done) {
    db = global.getDataSource({
      host: '127.0.0.1',
      port: global.config.port,
      implicitNullType,
    });
    implicitNullType = !implicitNullType;
    TestAlias = db.define('TestAlias', {foo: {type: String}});
    db.automigrate(function(err) {
      if (err) return done(err);
      TestAlias.create({foo: 'foo'}, function(err, t) {
        if (err) return done(err);
        sampleId = t.id;
        done();
      });
    });
  });

  it('find none by id: sampleId, deletedAt: null (implicitNullType=false)', function(done) {
    db.connector.all('TestAlias', {where: {id: sampleId, deletedAt: null}}, {}, function(err, r) {
      if (err) return done(err);
      if (r.length) {
        return done(new Error('all should not have found the TestAlias document'));
      }
      done();
    });
  });

  it('find all by id: sampleId, deletedAt: null (implicitNullType=true)', function(done) {
    db.connector.all('TestAlias', {where: {id: sampleId, deletedAt: null}}, {}, function(err, r) {
      if (err) return done(err);
      r[0].foo.should.equal('foo');
      done();
    });
  });
});
