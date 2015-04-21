var DataSource = require('loopback-datasource-juggler').DataSource;
var connector = require('../..');

var db = new DataSource(connector, {
  host: process.env.LB_HOST || '127.0.0.1',
  port: process.env.LB_PORT || 27017,
  database: process.env.LB_DB || 'strongloop'
});
var Todo = db.define('Todo', {
  content: {type: String}
});

module.exports = Todo;
