// Copyright IBM Corp. 2018,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

require('./init.js');
const promisify = require('bluebird').promisify;
const Decimal128 = require('mongodb').Decimal128;

let db, OrderDecimal;

describe('model with decimal property', function() {
  before(function(done) {
    db = global.getDataSource();
    const propertyDef = {
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

  it('should ignore if value not provided in payload', function() {
    const decimalAndNumberModel = db.define('decimalAndNumberModel', {
      objProp: {
        type: {
          decimalProp: {
            type: String,
            mongodb: {
              dataType: 'Decimal128',
            },
          },
          numProp: Number,
        },
      },
    });
    const createData = {
      objProp: {
        numProp: 1,
      },
    };
    const updateData = {
      objProp: {
        numProp: 2,
      },
    };
    let instanceId;
    return decimalAndNumberModel.create(createData)
      .then(function(createdInstance) {
        instanceId = createdInstance.id;
        createdInstance.objProp.numProp.should.eql(1);
        createdInstance.objProp.should.not.have.keys('decimalProp');
        return decimalAndNumberModel.updateAll({id: instanceId}, updateData);
      })
      .then(function() {
        return decimalAndNumberModel.findById(instanceId);
      })
      .then(function(updatedInstance) {
        updatedInstance.objProp.numProp.should.eql(2);
        updatedInstance.objProp.should.not.have.keys('decimalProp');
      });
  });

  context('nested decimal props', function() {
    context('should create/update instance', function() {
      it('for array of decimal props', function() {
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

        const createData = {
          'randomReview': [
            '3.5',
            '4.5',
            '4.0',
          ],
        };
        const updateData = {
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
          .then(function() {
            return findRawModelDataAsync('modelWithDecimalArray', instanceId);
          })
          .then(function(updatedInstance) {
            updatedInstance.randomReview[0].should.be.instanceOf(Decimal128);
            updatedInstance.randomReview[0].should.deepEqual(Decimal128.fromString('5.5'));
          });
      });
      it('for nested decimal prop inside array', function() {
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

      it('for nested decimal prop inside object', function() {
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
      it('for decimal prop within 2D array', function() {
        const arrayWithinArrayModel = db.define('arrayWithinArrayModel', {
          arrayProp: [{
            nestedArray: [{
              decimalProp: {
                type: String,
                mongodb: {
                  dataType: 'Decimal128',
                },
              },
            }],
          }],
        });
        const createData = {
          arrayProp: [
            {
              nestedArray: [{decimalProp: '1.1'}, {decimalProp: '2.2'}],
            },
          ],
        };
        const updateData = {
          arrayProp: [
            {
              nestedArray: [{decimalProp: '3.3'}, {decimalProp: '4.4'}],
            },
          ],
        };
        let instanceId;
        return arrayWithinArrayModel.create(createData)
          .then(function(createdInstance) {
            instanceId = createdInstance.id;
            return findRawModelDataAsync('arrayWithinArrayModel', instanceId);
          })
          .then(function(createdInstance) {
            createdInstance.arrayProp[0].nestedArray[0].decimalProp.should.be.instanceOf(Decimal128);
            createdInstance.arrayProp[0].nestedArray[0].decimalProp.should.deepEqual(Decimal128.fromString('1.1'));
            return arrayWithinArrayModel.updateAll({id: instanceId}, updateData);
          })
          .then(function() {
            return findRawModelDataAsync('arrayWithinArrayModel', instanceId);
          })
          .then(function(updatedInstance) {
            updatedInstance.arrayProp[0].nestedArray[0].decimalProp.should.be.instanceOf(Decimal128);
            updatedInstance.arrayProp[0].nestedArray[0].decimalProp.should.deepEqual(Decimal128.fromString('3.3'));
          });
      });
      it('for decimal prop in object within array', function() {
        const objectWithinArrayModel = db.define('objectWithinArrayModel', {
          arrayProp: [{
            nestedObject: {
              type: {
                decimalProp: {
                  type: String,
                  mongodb: {
                    dataType: 'Decimal128',
                  },
                },
              },
            },
          }],
        });
        const createData = {
          arrayProp: [
            {
              nestedObject: {decimalProp: '1.1'},
            },
          ],
        };
        const updateData = {
          arrayProp: [
            {
              nestedObject: {decimalProp: '3.3'},
            },
          ],
        };
        let instanceId;
        return objectWithinArrayModel.create(createData)
          .then(function(createdInstance) {
            instanceId = createdInstance.id;
            return findRawModelDataAsync('objectWithinArrayModel', instanceId);
          })
          .then(function(createdInstance) {
            createdInstance.arrayProp[0].nestedObject.decimalProp.should.be.instanceOf(Decimal128);
            createdInstance.arrayProp[0].nestedObject.decimalProp.should.deepEqual(Decimal128.fromString('1.1'));
            return objectWithinArrayModel.updateAll({id: instanceId}, updateData);
          })
          .then(function() {
            return findRawModelDataAsync('objectWithinArrayModel', instanceId);
          })
          .then(function(updatedInstance) {
            updatedInstance.arrayProp[0].nestedObject.decimalProp.should.be.instanceOf(Decimal128);
            updatedInstance.arrayProp[0].nestedObject.decimalProp.should.deepEqual(Decimal128.fromString('3.3'));
          });
      });
      it('for decimal prop in array within object', function() {
        const arrayWithinObjectModel = db.define('arrayWithinObjectModel', {
          objProp: {
            type: {
              nestedArray: [{
                decimalProp: {
                  type: String,
                  mongodb: {
                    dataType: 'Decimal128',
                  },
                },
              }],
            },
          },
        });
        const createData = {
          objProp: {
            nestedArray: [{decimalProp: '1.1'}],
          },
        };
        const updateData = {
          objProp: {
            nestedArray: [{decimalProp: '3.3'}],
          },
        };
        let instanceId;
        return arrayWithinObjectModel.create(createData)
          .then(function(createdInstance) {
            instanceId = createdInstance.id;
            return findRawModelDataAsync('arrayWithinObjectModel', instanceId);
          })
          .then(function(createdInstance) {
            createdInstance.objProp.nestedArray[0].decimalProp.should.be.instanceOf(Decimal128);
            createdInstance.objProp.nestedArray[0].decimalProp.should.deepEqual(Decimal128.fromString('1.1'));
            return arrayWithinObjectModel.updateAll({id: instanceId}, updateData);
          })
          .then(function() {
            return findRawModelDataAsync('arrayWithinObjectModel', instanceId);
          })
          .then(function(updatedInstance) {
            updatedInstance.objProp.nestedArray[0].decimalProp.should.be.instanceOf(Decimal128);
            updatedInstance.objProp.nestedArray[0].decimalProp.should.deepEqual(Decimal128.fromString('3.3'));
          });
      });

      it('for decimal prop in object within object', function() {
        const nestedObjectModel = db.define('nestedObjectModel', {
          objProp: {
            type: {
              nestedObject: {
                type: {
                  decimalProp: {
                    type: String,
                    mongodb: {
                      dataType: 'Decimal128',
                    },
                  },
                },
              },
            },
          },
        });
        const createData = {
          objProp: {
            nestedObject: {decimalProp: '1.1'},
          },
        };
        const updateData = {
          objProp: {
            nestedObject: {decimalProp: '3.3'},
          },
        };
        let instanceId;
        return nestedObjectModel.create(createData)
          .then(function(createdInstance) {
            instanceId = createdInstance.id;
            return findRawModelDataAsync('nestedObjectModel', instanceId);
          })
          .then(function(createdInstance) {
            createdInstance.objProp.nestedObject.decimalProp.should.be.instanceOf(Decimal128);
            createdInstance.objProp.nestedObject.decimalProp.should.deepEqual(Decimal128.fromString('1.1'));
            return nestedObjectModel.updateAll({id: instanceId}, updateData);
          })
          .then(function() {
            return findRawModelDataAsync('nestedObjectModel', instanceId);
          })
          .then(function(updatedInstance) {
            updatedInstance.objProp.nestedObject.decimalProp.should.be.instanceOf(Decimal128);
            updatedInstance.objProp.nestedObject.decimalProp.should.deepEqual(Decimal128.fromString('3.3'));
          });
      });
    });

    function findRawModelData(modelName, id, cb) {
      db.connector.execute(modelName, 'findOne', {_id: {$eq: id}}, {safe: true}, cb);
    }
    const findRawModelDataAsync = promisify(findRawModelData);
  });
});
