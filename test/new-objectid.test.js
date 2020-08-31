// Copyright IBM Corp. 2013,2020. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

require('./init.js');

const {ObjectID} = require('..')
const mongodb = require('mongodb')
let Book, Chapter;
const ds = global.getDataSource();
const objectIDLikeString = '7cd2ad46ffc580ba45d3cb1f';
const objectIDLikeString2 = '7cd2ad46ffc580ba45d3cb1e';
const promisify = require('bluebird').promisify;


describe.only('New ObjectID', function() {

  const Book = ds.createModel(
    'Book',
    {
      num: {type: String, mongodb: {dataType: 'decimal128'}},
      oId: {type: String, mongodb: {dataType: 'objectID'}},
      oIds: {type: [String], mongodb: {dataType: 'objectID'}},
      title: String,
      strId: String,
      strIds: [String],
      authorId: {type: String, mongodb: {dataType: 'objectID'}},
    },
    {strictObjectIDCoercion: true}
  );

  const Author = ds.createModel(
    'Author',
    {
      name: String
    },
    {strictObjectIDCoercion: true}
  );

  beforeEach(async () => {
    await Book.deleteAll();
    await Author.deleteAll();

    Author.hasMany('books');
    Book.belongsTo('author');
  });

  it('should identify ObjectID declaration', async () => {
    const created = await Book.create({
      oId: objectIDLikeString,
      oIds: [objectIDLikeString, objectIDLikeString2],
      title: 'abc',
      sId: objectIDLikeString,
      sIds: [objectIDLikeString, objectIDLikeString2]
    });

    (created.id.constructor.name).should.equal('String');
    (created.oId.constructor.name).should.equal('String');
    created.oIds.forEach(oId => {
      (oId.constructor.name).should.equal('String');
    });
    (created.sId.constructor.name).should.equal('String');
    created.sIds.forEach(sId => {
      (created.sId.constructor.name).should.equal('String');
    });
});

  it('should support LB ObjectID values', async () => {
    const b=  await Book.create({
      authorId: new ObjectID('7cd2ad46ffc580ba65d3cb1f')
    });
    (b.authorId.constructor.name).should.equal('String');
});
  it('should support MongoDB ObjectID values', async () => {
    const b=  await Book.create({
      authorId: new mongodb.ObjectID('7cd2ad46ffc580ba65d3cb1f'),
    });
    (b.authorId.constructor.name).should.equal('String');
  });


  it('should support MongoDB Decimal128 values', async () => {
    const b=  await Book.create({
      num: new mongodb.Decimal128('12345')
    });
    (b.num.constructor.name).should.equal('String');
  });

  it('should coerce MongodB values in constructor', () => {
    const b = new Book({
      title: 1,
      authorId: new mongodb.ObjectID('7cd2ad46ffc580ba65d3cb1f'),
      num: new mongodb.Decimal128('12345')
    });
    console.log('Instance:', b)
    console.log('Data', b.__data)
    (b.num.constructor.name).should.equal('String');
    (b.authorId.constructor.name).should.equal('String');
  });

  it.only('should identify ObjectID in relations', async () => {
    const author = await Author.create({ name: 'Bob'});
    (author.id.constructor.name).should.equal('String');
    const book = await Book.create({authorId: author.id, title: 'The Jungle'});
    (book.id.constructor.name).should.equal('String');
    (book.authorId.constructor.name).should.equal('String');
    const foundBook = await Book.findById(book.id);
    (foundBook.id.constructor.name).should.equal('String');
    const foundBooksByAuthor = await Book.all({authorId: author.id});
    (foundBooksByAuthor[0].id.constructor.name).should.equal('String');
    (foundBooksByAuthor[0].authorId.constructor.name).should.equal('String');
    const replaced = await Book.replaceById(book.id, {title: 'The Book'});
    (replaced.id.constructor.name).should.equal('String');
  });

});
