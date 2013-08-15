var DataSource = require('loopback-datasource-juggler').DataSource;

var ds = new DataSource({
    connector: require('../'),
    host: 'localhost',
    database: 'connector'
});

var Customer = ds.createModel('customer', {id: {type: Number, id: true}, name: String, emails: [String], age: Number});

Customer.create({
    // id: '1',
    name: 'John1',
    emails: ['john@x.com', 'john@y.com'],
    age: 30
}, function(err, customer) {
    console.log(customer.toObject());

    /*
    customer.updateAttributes({name: 'John'}, function(err, result) {
        console.log(err, result);
    });
    */

    customer.delete(function(err, result) {
        customer.updateAttributes({name: 'JohnX'}, function(err, result) {
            console.log(err, result);
        });

    });

    /*
    Customer.findById(customer.id, function(err, customer) {
        console.log(customer.toObject());

        customer.name = 'John';
        customer.save(function(err, customer) {
            console.log(customer.toObject());
        });
    });
    */
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
