var DataSource = require('loopback-datasource-juggler').DataSource;

var config = require('rc')('loopback', {dev: {mongodb:{}}}).dev.mongodb;

var ds = new DataSource(require('../'), config);

var Customer = ds.createModel('customer', {seq: {type: Number, id: true}, name: String, emails: [String], age: Number});

Customer.create({
    seq: 1,
    name: 'John1',
    emails: ['john@x.com', 'john@y.com'],
    age: 30
}, function(err, customer) {
    console.log(customer.toObject());

    /*
    customer.updateAttributes({name: 'John'}, function(err, result) {
        console.log(err, result);
    });


    customer.delete(function(err, result) {
        customer.updateAttributes({name: 'JohnX'}, function(err, result) {
            console.log(err, result);
        });

    });
     */

    Customer.findById(customer.seq, function(err, customer) {
        console.log(customer.toObject());

        customer.name = 'John';
        customer.save(function(err, customer) {
            console.log(customer.toObject());
            ds.connector.close();
        });
    });
});

/*
Customer.create({
    id: 2,
    name: 'John2',
    emails: ['john@x.com', 'jhon@y.com'],
    age: 30
}, function(err, customer) {
    console.log(customer.toObject());
});
*/
