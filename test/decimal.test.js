// Copyright IBM Corp. 2013,2016. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

require('./init.js');
const promisify = require('bluebird').promisify;
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

  it('destroyAll - deletes all with where', function() {
    return OrderDecimal.create({count: '0.0006'})
      .then(function() {
        return OrderDecimal.destroyAll({count: '0.0005'});
      })
      .then(function() {
        return OrderDecimal.find();
      })
      .then(function(r) {
        r.length.should.equal(1);
        r[0].count.should.deepEqual(Decimal128.fromString('0.0006'));
      });
  });

  context('nested decimal props', function() {
    it('should create/update instance for array of decimal props', function() {
      const modelWithDecimalArray = db.define('modelWithDecimalArray', {
        randomReview: {
          type: [String],
          mongodb: {
            dataType: 'Decimal128',
          },
        },
      }, {
        updateOnLoad: true,
      });

      var createData = {
        'randomReview': [
          '3.5',
          '4.5',
          '4.0',
        ],
      };
      var updateData = {
        'randomReview': [
          '5.5',
          '5.5',
          '5.5',
        ],
      };
      let instanceId;

      return modelWithDecimalArray.create(createData)
        .then(function(inst) {
          instanceId = inst.id;
          return findRawModelDataAsync('modelWithDecimalArray', instanceId);
        })
        .then(function(createdInstance) {
          createdInstance.randomReview[0].should.be.instanceOf(Decimal128);
          createdInstance.randomReview[0].should.deepEqual(Decimal128.fromString('3.5'));
          return modelWithDecimalArray.updateAll({id: instanceId}, updateData);
        })
        .then(function(inst) {
          return findRawModelDataAsync('modelWithDecimalArray', instanceId);
        })
        .then(function(updatedInstance) {
          updatedInstance.randomReview[0].should.be.instanceOf(Decimal128);
          updatedInstance.randomReview[0].should.deepEqual(Decimal128.fromString('5.5'));
        });
    });
    it('should create/update instance for nested decimal prop inside array', function() {
      const modelWithDecimalNestedArray = db.define('modelWithDecimalNestedArray', {
        tickets: {
          type: [
            {
              theatre: {
                type: String,
              },
              unitprice: {
                type: String,
                mongodb: {
                  dataType: 'Decimal128',
                },
              },
              capacity: {
                type: Number,
              },
            },
          ],
        },
      });
      const createData = {
        'tickets': [
          {
            'theatre': 'AMC',
            'capacity': '205',
            'unitprice': '19.5',
          },
          {
            'theatre': 'IMAX',
            'capacity': '300',
            'unitprice': '39.5',
          },
        ],
      };

      const updateData = {
        'tickets': [
          {
            'theatre': 'Cineplex',
            'capacity': '500',
            'unitprice': '27.5',
          },
          {
            'theatre': 'Cineplex 3D',
            'capacity': '500',
            'unitprice': '45.50',
          },
        ],
      };
      let instanceId;

      return modelWithDecimalNestedArray.create(createData)
        .then(function(inst) {
          instanceId = inst.id;
          return findRawModelDataAsync('modelWithDecimalNestedArray', instanceId);
        })
        .then(function(createdInstance) {
          createdInstance.tickets[0].unitprice.should.be.instanceOf(Decimal128);
          createdInstance.tickets[0].unitprice.should.deepEqual(Decimal128.fromString('19.5'));
          return modelWithDecimalNestedArray.updateAll({id: instanceId}, updateData);
        })
        .then(function(inst) {
          return findRawModelDataAsync('modelWithDecimalNestedArray', instanceId);
        })
        .then(function(updatedInstance) {
          updatedInstance.tickets[0].unitprice.should.be.instanceOf(Decimal128);
          updatedInstance.tickets[0].unitprice.should.deepEqual(Decimal128.fromString('27.5'));
        });
    });

    it('should create/update instance for nested decimal prop inside object', function() {
      const modelWithDecimalNestedObject = db.define('modelWithDecimalNestedObject', {
        awards: {
          type: {
            wins: {
              type: Number,
            },
            prizeMoney: {
              type: String,
              mongodb: {
                dataType: 'Decimal128',
              },
            },
            currency: {
              type: String,
            },
          },
        },
      });
      const createData = {
        'awards': {
          'currency': 'USD',
          'wins': '4',
          'prizeMoney': '10000.00',
        },
      };

      const updateData = {
        'awards': {
          'currency': 'CAD',
          'wins': '10',
          'prizeMoney': '25000.00',
        },
      };

      let instanceId;

      return modelWithDecimalNestedObject.create(createData)
        .then(function(inst) {
          instanceId = inst.id;
          return findRawModelDataAsync('modelWithDecimalNestedObject', instanceId);
        })
        .then(function(createdInstance) {
          createdInstance.awards.prizeMoney.should.be.instanceOf(Decimal128);
          createdInstance.awards.prizeMoney.should.deepEqual(Decimal128.fromString('10000.00'));
          return modelWithDecimalNestedObject.updateAll({id: instanceId}, updateData);
        })
        .then(function() {
          return findRawModelDataAsync('modelWithDecimalNestedObject', instanceId);
        })
        .then(function(updatedInstance) {
          updatedInstance.awards.prizeMoney.should.be.instanceOf(Decimal128);
          updatedInstance.awards.prizeMoney.should.deepEqual(Decimal128.fromString('25000.00'));
        });
    });
    it('should create/update instance for deeply nested decimal props', function() {
      const modelWithDeepNestedDecimalProps = db.define('modelWithDeepNestedDecimalProps', {
        imdb: {
          type: {
            duration: {
              type: Number,
            },
            reviewDate: {
              type: Date,
            },
            rating: {
              type: String,
              mongodb: {
                dataType: 'Decimal128',
              },
            },
            innerArray: [
              {
                testNumber: {
                  type: Number,
                },
                testDate: {
                  type: Date,
                },
                testDecimal: {
                  type: String,
                  mongodb: {
                    dataType: 'Decimal128',
                  },
                },
                ObjInsideAnArray: {
                  testNumber: {
                    type: Number,
                  },
                  testDate: {
                    type: Date,
                  },
                  testDecimal: {
                    type: String,
                    mongodb: {
                      dataType: 'Decimal128',
                    },
                  },
                },
                nestedArray: [
                  {
                    testNumber: {
                      type: Number,
                    },
                    testDate: {
                      type: Date,
                    },
                    testDecimal: {
                      type: String,
                      mongodb: {
                        dataType: 'Decimal128',
                      },
                    },
                  },
                ],
              },
            ],
            innerObj: {
              innerObj: {
                innerObj: {
                  innerObj: {
                    testNumber: {
                      type: Number,
                    },
                    testDate: {
                      type: Date,
                    },
                    testDecimal: {
                      type: String,
                      mongodb: {
                        dataType: 'Decimal128',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const createData = {
        'imdb': {
          'reviewDate': '2019-01-29T04:00:39.828Z',
          'innerArray': [
            {
              'ObjInsideAnArray': {
                'testNumber': '1234',
                'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
                'testDecimal': '99.55',
              },
              'nestedArray': [
                {
                  'testNumber': '1234',
                  'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
                  'testDecimal': '99.55',
                },
                {
                  'testNumber': '1234',
                  'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
                  'testDecimal': '99.55',
                },
              ],
              'testNumber': '1234',
              'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
              'testDecimal': '99.55',
            },
            {
              'ObjInsideAnArray': null,
              'nestedArray': null,
              'testNumber': '5678',
              'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
              'testDecimal': '99.55',
            },
          ],
          'innerObj': {
            'innerObj': {
              'innerObj': {
                'innerObj': {
                  'testNumber': '6666',
                  'testDate': '2019-01-30 18:26:38.551022',
                  'testDecimal': '55.55',
                },
              },
            },
          },
          'duration': '135',
          'rating': '4.5',
        },
      };

      const updateData = {
        'imdb': {
          'reviewDate': '2019-01-29T04:00:39.828Z',
          'innerArray': [
            {
              'ObjInsideAnArray': {
                'testNumber': '7777',
                'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
                'testDecimal': '77.77',
              },
              'nestedArray': [
                {
                  'testNumber': '7777',
                  'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
                  'testDecimal': '77.77',
                },
                {
                  'testNumber': '7777',
                  'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
                  'testDecimal': '77.77',
                },
              ],
              'testNumber': '7777',
              'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
              'testDecimal': '11.11',
            },
            {
              'ObjInsideAnArray': {
                'testNumber': '7777',
                'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
                'testDecimal': '77.77',
              },
              'nestedArray': null,
              'testNumber': '7777',
              'testDate': "TIMESTAMP '2019-01-30 18:26:38.551022'",
              'testDecimal': '22.22',
            },
          ],
          'innerObj': {
            'innerObj': {
              'innerObj': {
                'innerObj': {
                  'testNumber': '7777',
                  'testDate': '2019-01-30 18:26:38.551022',
                  'testDecimal': '77.77',
                },
              },
            },
          },
          'duration': '135',
          'rating': '7.5',
        },
      };
      let instanceId;

      return modelWithDeepNestedDecimalProps.create(createData)
        .then(function(inst) {
          instanceId = inst.id;
          return findRawModelDataAsync('modelWithDeepNestedDecimalProps', instanceId);
        })
        .then(function(createdInstance) {
          createdInstance.imdb.rating.should.be.instanceOf(Decimal128);
          createdInstance.imdb.rating.should.deepEqual(Decimal128.fromString('4.5'));
          createdInstance.imdb.innerObj.innerObj.innerObj.innerObj.testDecimal
            .should.be.instanceOf(Decimal128);
          createdInstance.imdb.innerObj.innerObj.innerObj.innerObj.testDecimal
            .should.deepEqual(Decimal128.fromString('55.55'));
          createdInstance.imdb.innerArray[0].testDecimal
            .should.be.instanceOf(Decimal128);
          createdInstance.imdb.innerArray[0].testDecimal
            .should.deepEqual(Decimal128.fromString('99.55'));
          createdInstance.imdb.innerArray[0].ObjInsideAnArray.testDecimal
            .should.deepEqual(Decimal128.fromString('99.55'));
          createdInstance.imdb.innerArray[0].ObjInsideAnArray.testDecimal
            .should.be.instanceOf(Decimal128);
          createdInstance.imdb.innerArray[0].nestedArray[0]
            .testDecimal.should.be.instanceOf(Decimal128);
          createdInstance.imdb.innerArray[0].nestedArray[0]
            .testDecimal.should.deepEqual(Decimal128.fromString('99.55'));
          return modelWithDeepNestedDecimalProps.updateAll({id: instanceId}, updateData);
        })
        .then(function() {
          return findRawModelDataAsync('modelWithDeepNestedDecimalProps', instanceId);
        })
        .then(function(updatedInstance) {
          updatedInstance.imdb.rating.should.be.instanceOf(Decimal128);
          updatedInstance.imdb.rating.should.deepEqual(Decimal128.fromString('7.5'));
          updatedInstance.imdb.innerObj.innerObj.innerObj.innerObj.testDecimal
            .should.be.instanceOf(Decimal128);
          updatedInstance.imdb.innerObj.innerObj.innerObj.innerObj.testDecimal
            .should.deepEqual(Decimal128.fromString('77.77'));
          updatedInstance.imdb.innerArray[0].testDecimal
            .should.be.instanceOf(Decimal128);
          updatedInstance.imdb.innerArray[0].testDecimal
            .should.deepEqual(Decimal128.fromString('11.11'));
          updatedInstance.imdb.innerArray[0].ObjInsideAnArray.testDecimal
            .should.deepEqual(Decimal128.fromString('77.77'));
          updatedInstance.imdb.innerArray[0].ObjInsideAnArray.testDecimal
            .should.be.instanceOf(Decimal128);
          updatedInstance.imdb.innerArray[0].nestedArray[0]
            .testDecimal.should.be.instanceOf(Decimal128);
          updatedInstance.imdb.innerArray[0].nestedArray[0]
            .testDecimal.should.deepEqual(Decimal128.fromString('77.77'));
        });
    });

    function findRawModelData(modelName, id, cb) {
      db.connector.execute(modelName, 'findOne', {_id: {$eq: id}}, {safe: true}, cb);
    }
    const findRawModelDataAsync = promisify(findRawModelData);
  });
});
