// Copyright IBM Corp. 2013,2016. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

require('./init.js');
const Decimal128 = require('mongodb').Decimal128;

var db, OrderDecimal, OrderDecimalArr, OrderDecimalObj;

describe('decimal128', function() {
  describe('model with decimal property - first level', function() {
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

  describe('model with decimal property - nested array', function() {
    before(function(done) {
      db = global.getDataSource();
      var propertyDef = {
        // nested property in an array
        lines: [
          {
            unitPrice: {
              type: 'string',
              title: 'The unitPrice Schema ',
              mongodb: {
                dataType: 'Decimal128',
              },
            },
          },
        ],
      };

      OrderDecimalArr = db.createModel('OrderDecimalNested', propertyDef);
      OrderDecimalArr.destroyAll(done);
    });

    it('create - coerces strings to decimal 128', function(done) {
      const sample = {
        lines: [{unitPrice: '0.0005'}],
      };
      OrderDecimalArr.create(sample, function(err, order) {
        if (err) return done(err);
        // FIXME Ideally the returned data should have a decimal `count`
        // not a string. While juggler generates the returned data, connector
        // doesn't have any control.
        JSON.parse(JSON.stringify(order.lines)).should.deepEqual(sample.lines);
        done();
      });
    });

    it('find - filters nested array decimal property', function(done) {
      const cond = {where: {lines: {elemMatch: {unitPrice: Decimal128.fromString('0.0005')}}}};
      OrderDecimalArr.find(cond, function(err, orders) {
        if (err) return done(err);
        orders.length.should.be.above(0);
        const o = orders[0];
        o.lines[0].unitPrice.should.equal('0.0005');
        done();
      });
    });

    it('destroyAll - deletes all with where', function(done) {
      const anotherSample = {
        lines: [{unitPrice: '0.0006'}],
      };
      const cond = {lines: {elemMatch: {unitPrice: Decimal128.fromString('0.0005')}}};
      OrderDecimalArr.create(anotherSample)
        .then(function() {
          return OrderDecimalArr.destroyAll(cond);
        })
        .then(function() {
          return OrderDecimalArr.find();
        })
        .then(function(r) {
          r.length.should.equal(1);
          r[0].lines[0].unitPrice.should.equal('0.0006');
          done();
        })
        .catch(done);
    });
  });

  describe('model with decimal property - nested object', function() {
    before(function(done) {
      db = global.getDataSource();
      var propertyDef = {
        // nested property in an object
        summary: {
          totalValue: {
            type: 'string',
            title: 'The totalValue Schema ',
            mongodb: {
              dataType: 'Decimal128',
            },
          },
        },
      };

      OrderDecimalObj = db.createModel('OrderDecimalNested', propertyDef);
      OrderDecimalObj.destroyAll(done);
    });

    it('create - coerces strings to decimal 128', function(done) {
      const sample = {
        summary: {totalValue: '100.0005'},
      };
      OrderDecimalObj.create(sample, function(err, order) {
        if (err) return done(err);
        // FIXME Ideally the returned data should have a decimal `count`
        // not a string. While juggler generates the returned data, connector
        // doesn't have any control.
        JSON.parse(JSON.stringify(order.summary)).should.deepEqual(sample.summary);
        done();
      });
    });

    it('find - filters nested object decimal property', function(done) {
      const cond = {where: {'summary.totalValue': Decimal128.fromString('100.0005')}};
      OrderDecimalObj.find(cond, function(err, orders) {
        if (err) return done(err);
        orders.length.should.be.above(0);
        const o = orders[0];
        o.summary.totalValue.should.equal('100.0005');
        done();
      });
    });

    it('destroyAll - deletes all with where', function(done) {
      const anotherSample = {
        summary: {totalValue: '100.0006'},
      };
      const cond = {'summary.totalValue': Decimal128.fromString('100.0005')};
      OrderDecimalObj.create(anotherSample)
        .then(function() {
          return OrderDecimalObj.destroyAll(cond);
        })
        .then(function() {
          return OrderDecimalObj.find();
        })
        .then(function(r) {
          r.length.should.equal(1);
          r[0].summary.totalValue.should.equal('100.0006');
          done();
        })
        .catch(done);
    });
  });
});
