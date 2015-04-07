var DataSource = require('loopback-datasource-juggler').DataSource;

var config = require('rc')('loopback', {dev: {mongodb: {}}}).dev.mongodb;

var ds = new DataSource(require('../'), config);

var Customer = ds.createModel('customer', {seq: {type: Number, id: true}, name: String, emails: [
  {label: String, email: String}
], age: Number});

Customer.destroyAll(function (err) {
  Customer.create({
    seq: 1,
    name: 'John1',
    emails: [
      {label: 'work', email: 'john@x.com'},
      {label: 'home', email: 'john@y.com'}
    ],
    age: 30
  }, function (err, customer1) {
    console.log(customer1.toObject());

    Customer.create({
      seq: 2,
      name: 'John2',
      emails: [
        {label: 'work', email: 'john2@x.com'},
        {label: 'home', email: 'john2@y.com'}
      ],
      age: 35
    }, function (err, customer2) {

      Customer.find({where: {'emails.email': 'john@x.com'}}, function(err, customers) {
        console.log('Customers matched by emails.email', customers);
      });

      Customer.find({where: {'emails.0.label': 'work'}}, function(err, customers) {
        console.log('Customers matched by emails.0.label', customers);
      });

      Customer.find({where: {'name': {like: '(?i)john'}}, function(err, customers) {
        console.log('Customers matched case insensitively by name', customers);
      });
      /*
       customer1.updateAttributes({name: 'John'}, function(err, result) {
       console.log(err, result);
       });


       customer1.delete(function(err, result) {
       customer1.updateAttributes({name: 'JohnX'}, function(err, result) {
       console.log(err, result);
       });

       });
       */

      Customer.findById(customer1.seq, function (err, customer1) {
        console.log(customer1.toObject());

        customer1.name = 'John';
        customer1.save(function (err, customer1) {
          console.log(customer1.toObject());
          ds.disconnect();
        });
      });
    });
  });
});


