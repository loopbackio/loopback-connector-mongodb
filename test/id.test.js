require('./init.js');
var ds = getDataSource();

describe('mongodb custom id name', function () {
  var Customer = ds.createModel('customer', {seq: {type: Number, id: true}, name: String, emails: [String], age: Number});

  before(function(done) {
    Customer.deleteAll(done);
  });

  it('should allow custom name for the id property for create', function(done) {
    Customer.create({
      seq: 1,
      name: 'John1',
      emails: ['john@x.com', 'john@y.com'],
      age: 30
    }, function(err, customer) {
      customer.seq.should.equal(1);
      Customer.create({
        seq: 2,
        name: 'John2',
        emails: ['john2@x.com', 'john2@y.com'],
        age: 40
      }, function(err, customer) {
        customer.seq.should.equal(2);
        done(err, customer);
      });
    });
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

describe('mongodb string id', function () {
  var Customer = ds.createModel('customer2', {seq: {type: String, id: true},
    name: String, emails: [String], age: Number});
  var customer1, customer2;

  before(function(done) {
    Customer.deleteAll(done);
  });

  it('should allow custom name for the id property for create', function(done) {
    Customer.create({
      seq: '1',
      name: 'John1',
      emails: ['john@x.com', 'john@y.com'],
      age: 30
    }, function(err, customer) {
      customer.seq.should.equal('1');
      customer1 = customer;
      var customer2Id = new ds.ObjectID().toString();
      Customer.create({
        seq: customer2Id,
        name: 'John2',
        emails: ['john2@x.com', 'john2@y.com'],
        age: 40
      }, function(err, customer) {
        customer2 = customer;
        customer.seq.should.equal(customer2Id);
        done(err, customer);
      });
    });
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

  it('should allow inq with find', function(done) {
    Customer.find({where: {seq: {inq: [customer2.seq]}}}, function(err, customers) {
      customers.length.should.equal(1);
      customers[0].seq.should.equal(customer2.seq);
      done(err);
    });
  });

});

describe('mongodb default id type', function () {
  var Account = ds.createModel('account', {seq: {generated: true, id: true},
    name: String, emails: [String], age: Number});

  before(function(done) {
    Account.deleteAll(done);
  });

  it('should generate id value for create', function (done) {
    Account.create({
      name: 'John1',
      emails: ['john@x.com', 'john@y.com'],
      age: 30
    }, function (err, account) {
      account.should.have.property('seq');
      Account.findById(account.seq, function (err, account1) {
        account1.seq.should.eql(account.seq);
        done(err, account);
      });
    });
  });

});

describe('mongodb default id name', function () {
  var Customer1 = ds.createModel('customer1', {name: String, emails: [String], age: Number});

  before(function (done) {
    Customer1.deleteAll(done);
  });

  it('should allow value for the id property for create', function (done) {
    Customer1.create({
      id: 1,
      name: 'John1',
      emails: ['john@x.com', 'john@y.com'],
      age: 30
    }, function (err, customer) {
      customer.id.should.equal(1);
      done(err, customer);
    });
  });

  it('should allow value the id property for findById', function (done) {
    Customer1.findById(1, function (err, customer) {
      customer.id.should.equal(1);
      done(err, customer);
    });
  });

  it('should generate id value for create', function (done) {
    Customer1.create({
      name: 'John1',
      emails: ['john@x.com', 'john@y.com'],
      age: 30
    }, function (err, customer) {
      // console.log(customer);
      customer.should.have.property('id');
      Customer1.findById(customer.id, function (err, customer1) {
        customer1.id.should.eql(customer.id);
        done(err, customer);
      });
    });
  });

});

