// Copyright IBM Corp. 2013,2016. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

require('./init.js');
const Decimal128 = require('mongodb').Decimal128;

var db, OrderDecimal;

describe('model with decimal property', function() {
  before(function(done) {
    db = global.getDataSource();
    var propertyDef = {
      count: {
        type: String,
        mongodb: {
          dataType: 'Decimal128',
        },
      },
    };

    OrderDecimal = db.createModel('OrderDecimal', propertyDef);
    OrderDecimal.destroyAll(done);
  });

  it('create - coerces strings to decimal 128', function(done) {
    OrderDecimal.create({count: '0.0005'}, function(err, order) {
      if (err) return done(err);
      // FIXME Ideally the returned data should have a decimal `count`
      // not a string. While juggler generates the returned data, connector
      // doesn't have any control.
      order.count.should.equal('0.0005');
      done();
    });
  });

  it('find - filters decimal property', function(done) {
    OrderDecimal.find({where: {count: '0.0005'}}, function(err, orders) {
      if (err) return done(err);
      orders.length.should.be.above(0);
      const o = orders[0];
      o.count.should.deepEqual(Decimal128.fromString('0.0005'));
      o.count.should.be.an.instanceOf(Decimal128);
      done();
    });
  });

  it('destroyAll - deletes all with where', function(done) {
    OrderDecimal.create({count: '0.0006'})
      .then(function() {
        return OrderDecimal.destroyAll({count: '0.0005'});
      })
      .then(function() {
        return OrderDecimal.find();
      })
      .then(function(r) {
        r.length.should.equal(1);
        r[0].count.should.deepEqual(Decimal128.fromString('0.0006'));
        done();
      })
      .catch(done);
  });
});
