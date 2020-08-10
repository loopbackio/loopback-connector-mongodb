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

  const Book = ds.createModel(
    'Book',
    {
      oId: {type: String, mongodb: {dataType: 'objectID'}},
      oIds: {type: [String], mongodb: {dataType: 'objectID'}},
      title: String,
      strId: String,
      strIds: [String]
    }
  );

  const Author = ds.createModel(
    'Author',
    {
      name: String
    }
  );

  beforeEach(async () => {
    await Book.deleteAll();
    await Author.deleteAll();

    Author.hasMany('books');
    Book.belongsTo('author');
  });

  // Manual review of the datatype in the database
  it('should identify ObjectID and ObjectID-like non-ObjectID types', async () => {
    const created = await Book.create({
      oId: objectIDLikeString,
      oIds: [objectIDLikeString, objectIDLikeString2],
      title: 'abc',
      sId: objectIDLikeString,
      sIds: [objectIDLikeString, objectIDLikeString2]
    });

    console.log(created)

    // (created.id.constructor.name).should.equal('String');
    // (created.oId.constructor.name).should.equal('String');
    // created.oIds.forEach(oId => {
    //   (created.oId.constructor.name).should.equal('String');
    // });
    // (created.sId.constructor.name).should.equal('String');
    // created.sIds.forEach(sId => {
    //   (created.sId.constructor.name).should.equal('String');
    // });
  });

  // it('should identify ObjectID in relations', async () => {
  //   const author = await Author.create({ name: 'Bob'});
  //   console.log(author.id.constructor);
  //   const book = await Book.create({authorId: author.id, title: 'XYS'});
  //   console.log(book);
  //   const foundBook = await Book.findById(book.id);
  //   console.log(foundBook);
  //   const foundBooksByAuthor = await Book.all({authorId: author.id});
  //   console.log(foundBooksByAuthor);
  // });


});
