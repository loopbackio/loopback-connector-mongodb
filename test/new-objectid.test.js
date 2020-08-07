// Copyright IBM Corp. 2013,2020. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

require('./init.js');

let Book, Chapter;
const ds = global.getDataSource();
const objectIDLikeString = '7cd2ad46ffc580ba45d3cb1f';
const objectIDLikeString2 = '7cd2ad46ffc580ba45d3cb1e';
const promisify = require('bluebird').promisify;

describe.only('New ObjectID', function() {
  before(function() {
    Book = ds.define('Book');
    Chapter = ds.define('Chapter');
    Book.hasMany('chapters');
    Chapter.belongsTo('book');
  });

  it('should convert 24 byte hex string as ObjectID', function() {
    const ObjectID = ds.connector.getDefaultIdType();
    const str = objectIDLikeString;
    ObjectID(str).should.be.an.instanceOf(ds.ObjectID);
  });

});
