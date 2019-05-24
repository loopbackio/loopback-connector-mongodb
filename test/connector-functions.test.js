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
