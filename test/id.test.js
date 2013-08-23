require('./init.js');
var ds = getDataSource();

describe('mongodb custom id name', function () {
    var Customer = ds.createModel('customer', {seq: {type: Number, id: true}, name: String, emails: [String], age: Number});

    before(function(done) {
        Customer.deleteAll(done);
    });

    it('should allow custom name for the id property for create', function (done) {
        Customer.create({
            seq: 1,
            name: 'John1',
            emails: ['john@x.com', 'john@y.com'],
            age: 30
        }, function (err, customer) {
            customer.seq.should.equal(1);
            done(err, customer);
        });
    });

    it('should allow custom name for the id property for findById', function (done) {
        Customer.findById(1, function (err, customer) {
            customer.seq.should.equal(1);
            done(err, customer);
        });
    });

    it('should generate id value for create', function (done) {
        Customer.create({
            name: 'John1',
            emails: ['john@x.com', 'john@y.com'],
            age: 30
        }, function (err, customer) {
            // console.log(customer);
            customer.should.have.property('seq');
            Customer.findById(customer.seq, function (err, customer1) {
                customer1.seq.should.equal(customer.seq);
                done(err, customer);
            });
        });
    });

});

describe('mongodb default id name', function () {
    var Customer1 = ds.createModel('customer1', {name: String, emails: [String], age: Number});

    before(function(done) {
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
                customer1.id.should.equal(customer.id);
                done(err, customer);
            });
        });
    });

});

