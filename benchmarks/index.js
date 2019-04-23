// Copyright IBM Corp. 2015,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var DataSource = require('loopback-datasource-juggler').DataSource;
var connector = require('..');
var Benchmark = require('benchmark');

var ds = new DataSource(connector, {
  host: process.env.LB_HOST || '127.0.0.1',
  port: process.env.LB_PORT || 27017,
  database: process.env.LB_DB || 'strongloop',
});
var Todo = ds.define('Todo', {
  content: {type: String},
});

// not critical for MongoDB, but may uncover inefficiencies in SQL connectors
// https://github.com/strongloop/loopback-connector-mongodb/pull/124/files#r28435614
var uniqVal = 0;

function resetTestState() {
  uniqVal = 0;
  Todo.destroyAll();
}

var suite = new Benchmark.Suite();
suite
  .on('start', function() {
    console.log('#', new Date());
  })
  .add('create', {
    defer: true,
    fn: function(deferred) {
      Todo.create({content: 'Buy eggs, ' + uniqVal++}, function() {
        deferred.resolve();
      });
    },
    onComplete: resetTestState,
  })
  .add('find', {
    defer: true,
    fn: function(deferred) {
      Todo.find(function() {
        deferred.resolve();
      });
    },
    onStart: function() {
      Todo.create([
        {content: 'Buy eggs'},
        {content: 'Buy milk'},
        {content: 'Buy cheese'},
      ]);
    },
    onComplete: resetTestState,
  })
  .add('find with a simple filter', {
    defer: true,
    fn: function(deferred) {
      Todo.find({where: {content: 'Buy milk'}}, function() {
        deferred.resolve();
      });
    },
    onStart: function() {
      Todo.create([
        {content: 'Buy eggs'},
        {content: 'Buy milk'},
        {content: 'Buy cheese'},
      ]);
    },
    onComplete: resetTestState,
  })
  .add('count without filter', {
    defer: true,
    fn: function(deferred) {
      Todo.count(function() {
        deferred.resolve();
      });
    },
    onStart: function() {
      const todos = [];
      for (let i = 0; i < 1000; i++) {
        todos.push({content: `Buy something ${i}`});
      }
      Todo.create(todos);
    },
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log();
    Todo.destroyAll();
    process.exit();
  })
  .run({async: true});
