// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

require('./init.js');
const ds = global.getDataSource();

describe('mongodb custom id name', function() {
  const Customer = ds.createModel(
    'customer',
    {
      seq: {type: Number, id: true},
      name: String,
      emails: [String],
      age: Number,
    },
    {forceId: false},
  );
  before(function(done) {
    Customer.deleteAll(done);
  });

  it('should allow custom name for the id property for create', function(done) {
    Customer.create(
      {
        seq: 1,
        name: 'John1',
        emails: ['john@x.com', 'john@y.com'],
        age: 30,
      },
      function(err, customer) {
        customer.seq.should.equal(1);
        Customer.create(
          {
            seq: 2,
            name: 'John2',
            emails: ['john2@x.com', 'john2@y.com'],
            age: 40,
          },
          function(err, customer) {
            customer.seq.should.equal(2);
            done(err, customer);
          },
        );
      },
    );
  });

  it('should allow custom name for the id property for findById', function(done) {
    Customer.findById(1, function(err, customer) {
      customer.seq.should.equal(1);
      done(err, customer);
    });
  });

  it('should allow inq with find', function(done) {
    Customer.find({where: {seq: {inq: [1]}}}, function(err, customers) {
      customers.length.should.equal(1);
      customers[0].seq.should.equal(1);
      done(err);
    });
  });
});

describe('mongodb string id', function() {
  const Customer = ds.createModel(
    'customer2',
    {
      seq: {type: String, id: true},
      name: String,
      emails: [String],
      age: Number,
    },
    {forceId: false},
  );
  let customer1, customer2;

  before(function(done) {
    Customer.deleteAll(done);
  });

  it('should allow custom name for the id property for create', function(done) {
    Customer.create(
      {
        seq: '1',
        name: 'John1',
        emails: ['john@x.com', 'john@y.com'],
        age: 30,
      },
      function(err, customer) {
        customer.seq.should.equal('1');
        customer1 = customer;
        const customer2Id = new ds.ObjectID().toString();
        Customer.create(
          {
            seq: customer2Id,
            name: 'John2',
            emails: ['john2@x.com', 'john2@y.com'],
            age: 40,
          },
          function(err, customer) {
            customer2 = customer;
            customer.seq.toString().should.eql(customer2Id);
            done(err, customer);
          },
        );
      },
    );
  });

  it('should allow custom name for the id property for findById', function(done) {
    Customer.findById(1, function(err, customer) {
      customer.seq.should.equal('1');
      done(err, customer);
    });
  });

  it('should allow inq with find', function(done) {
    Customer.find({where: {seq: {inq: [1]}}}, function(err, customers) {
      customers.length.should.equal(1);
      customers[0].seq.should.equal('1');
      done(err);
    });
  });

  it('should allow inq with find - test 2', function(done) {
    Customer.find({where: {seq: {inq: [customer2.seq]}}}, function(
      err,
      customers,
    ) {
      customers.length.should.equal(1);
      // seq is now a string
      customers[0].seq.should.eql(customer2.seq.toString());
      done(err);
    });
  });
});

describe('mongodb default id type', function() {
  const Account = ds.createModel(
    'account',
    {
      seq: {id: true, generated: true},
      name: String,
      emails: [String],
      age: Number,
    },
    {forceId: false},
  );

  before(function(done) {
    Account.deleteAll(done);
  });

  let id;
  it('should generate id value for create', function(done) {
    Account.create(
      {
        name: 'John1',
        emails: ['john@x.com', 'john@y.com'],
        age: 30,
      },
      function(err, account) {
        if (err) return done(err);
        account.should.have.property('seq');
        id = account.seq;
        Account.findById(id, function(err, account1) {
          if (err) return done(err);
          account1.seq.should.eql(account.seq);
          account.should.have.property('seq');
          done(err, account1);
        });
      },
    );
  });

  it('should be able to find by string id', function(done) {
    // Try to look up using string
    Account.findById(id.toString(), function(err, account1) {
      if (err) return done(err);
      account1.seq.should.eql(id);
      done(err, account1);
    });
  });

  it('should be able to delete by string id', function(done) {
    // Try to look up using string
    Account.destroyById(id.toString(), function(err, info) {
      if (err) return done(err);
      info.count.should.eql(1);
      done(err);
    });
  });
});

describe('mongodb default id name', function() {
  const Customer1 = ds.createModel(
    'customer1',
    {name: String, emails: [String], age: Number},
    {forceId: false},
  );

  before(function(done) {
    Customer1.deleteAll(done);
  });

  it('should allow value for the id property for create', function(done) {
    Customer1.create(
      {
        id: 1,
        name: 'John1',
        emails: ['john@x.com', 'john@y.com'],
        age: 30,
      },
      function(err, customer) {
        customer.id.should.equal(1);
        done(err, customer);
      },
    );
  });

  it('should allow value the id property for findById', function(done) {
    Customer1.findById(1, function(err, customer) {
      customer.id.should.equal(1);
      done(err, customer);
    });
  });

  it('should generate id value for create', function(done) {
    Customer1.create(
      {
        name: 'John1',
        emails: ['john@x.com', 'john@y.com'],
        age: 30,
      },
      function(err, customer) {
        customer.should.have.property('id');
        Customer1.findById(customer.id, function(err, customer1) {
          customer1.id.should.eql(customer.id);
          done(err, customer);
        });
      },
    );
  });
});

describe('strictObjectIDCoercion', function() {
  const ObjectID = ds.connector.getDefaultIdType();
  const objectIdLikeString = '7cd2ad46ffc580ba45d3cb1f';

  context('set to false (default)', function() {
    const User = ds.createModel(
      'user1',
      {
        id: {type: String, id: true},
        name: String,
      },
    );

    beforeEach(function(done) {
      User.deleteAll(done);
    });

    it('should coerce to ObjectID', async function() {
      const user = await User.create({id: objectIdLikeString, name: 'John'});
      user.id.should.be.an.instanceOf(ds.ObjectID);
    });

    it('should find model with ObjectID id', async function() {
      const user = await User.create({name: 'John'});
      user.id.should.be.an.instanceOf(ds.ObjectID);
      const found = await User.findById(user.id);
      found.toObject().name.should.equal('John');
    });

    it('should find model with ObjectID-like id', async function() {
      const user = await User.create({id: objectIdLikeString, name: 'John'});
      user.id.should.be.an.instanceOf(ds.ObjectID);
      user.id.should.eql(ObjectID(objectIdLikeString));
      const found = await User.findById(objectIdLikeString);
      found.toObject().name.should.equal('John');
    });

    it('should find model with string id', async function() {
      const user = await User.create({id: 'a', name: 'John'});
      user.id.should.be.an.instanceOf(String);
      user.id.should.equal('a');
      const found = await User.findById('a');
      found.toObject().name.should.equal('John');
    });
  });

  context('set to true', function() {
    const User = ds.createModel(
      'user2',
      {
        id: {type: String, id: true},
        name: String,
      },
      {strictObjectIDCoercion: true},
    );

    beforeEach(function(done) {
      User.deleteAll(done);
    });

    it('should not coerce to ObjectID', async function() {
      const user = await User.create({id: objectIdLikeString, name: 'John'});
      user.id.should.equal(objectIdLikeString);
    });

    it('should not find model with ObjectID id', async function() {
      const user = await User.create({name: 'John'});
      const found = await User.findById(user.id);
      (found === null).should.be.true();
    });

    it('should find model with ObjectID-like string id', async function() {
      const user = await User.create({id: objectIdLikeString, name: 'John'});
      user.id.should.not.be.an.instanceOf(ds.ObjectID);
      user.id.should.eql(objectIdLikeString);
      const found = await User.findById(objectIdLikeString);
      found.toObject().name.should.equal('John');
    });

    it('should find model with string id', async function() {
      const user = await User.create({id: 'a', name: 'John'});
      user.id.should.be.an.instanceOf(String);
      user.id.should.equal('a');
      const found = await User.findById('a');
      found.toObject().name.should.equal('John');
    });
  });

  context('set to true, id type set to ObjectID', function() {
    const User = ds.createModel(
      'user3',
      {
        id: {type: String, id: true, mongodb: {dataType: 'ObjectID'}},
        name: String,
      },
      {strictObjectIDCoercion: true},
    );

    const User1 = ds.createModel(
      'user4',
      {
        id: {type: String, id: true, mongodb: {dataType: 'objectid'}},
        name: String,
      },
      {strictObjectIDCoercion: true},
    );

    beforeEach(function(done) {
      User.deleteAll();
      User1.deleteAll(done);
    });

    it('should coerce to ObjectID', async function() {
      const user = await User.create({id: objectIdLikeString, name: 'John'});
      user.id.should.be.an.instanceOf(ds.ObjectID);
    });

    it('should coerce to ObjectID (lowercase)', async function() {
      const user = await User1.create({id: objectIdLikeString, name: 'John'});
      user.id.should.be.an.instanceOf(ds.ObjectID);
    });

    it('should throw if id is not a ObjectID-like string', async function() {
      try {
        await User.create({id: 'abc', name: 'John'});
      } catch (e) {
        e.message.should.match(/not an ObjectID string/);
      }
    });

    it('should find model with ObjectID id', async function() {
      const user = await User.create({name: 'John'});
      user.id.should.be.an.instanceOf(ds.ObjectID);
      const found = await User.findById(user.id);
      found.toObject().name.should.equal('John');
    });

    // This works by coercing string to ObjectID, overriding `strictObjectIDCoercion: true`
    it('should find model with ObjectID-like id', async function() {
      const user = await User.create({id: objectIdLikeString, name: 'John'});
      user.id.should.be.an.instanceOf(ds.ObjectID);
      user.id.should.eql(ObjectID(objectIdLikeString));
      const found = await User.findById(objectIdLikeString);
      found.toObject().name.should.equal('John');
    });

    it('should update model with ObjectID id', async function() {
      const user = await User.create({name: 'John'});
      await User.update({id: user.id, name: 'Jon'});
      const found = await User.findById(user.id);
      found.name.should.equal('Jon');
    });

    it('should update model with ObjectID-like id', async function() {
      const user = await User.create({id: objectIdLikeString, name: 'John'});
      await User.update({id: objectIdLikeString, name: 'Jon'});
      const found = await User.findById(objectIdLikeString);
      found.name.should.equal('Jon');
    });
  });
});
