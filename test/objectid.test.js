// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

require('./init.js');

let Book, Chapter;
const ds = global.getDataSource();
const objectIDLikeString = '7cd2ad46ffc580ba45d3cb1f';

describe('ObjectID', function() {
  before(function() {
    Book = ds.define('Book');
    Chapter = ds.define('Chapter');
    Book.hasMany('chapters');
    Chapter.belongsTo('book');
  });

  it('should cast foreign keys as ObjectID', function(done) {
    Chapter.beforeCreate = function(next, data) {
      data.bookId.should.be.an.instanceOf(ds.ObjectID);
      this.bookId.should.be.an.instanceOf(ds.ObjectID);
      next();
    };

    Book.create(function(err, book) {
      if (err) return done(err);
      Chapter.create({bookId: book.id.toString()}, done);
    });
  });

  it('should convert 24 byte hex string as ObjectID', function() {
    const ObjectID = ds.connector.getDefaultIdType();
    const str = objectIDLikeString;
    ObjectID(str).should.be.an.instanceOf(ds.ObjectID);
  });

  it('should not convert 12 byte string as ObjectID', function() {
    const ObjectID = ds.connector.getDefaultIdType();
    const str = 'line-by-line';
    ObjectID(str).should.be.equal(str);
  });

  it('should keep mongodb ObjectID as is', function() {
    const ObjectID = ds.connector.getDefaultIdType();
    const id = new ds.ObjectID();
    ObjectID(id).should.be.an.instanceOf(ds.ObjectID);
  });

  it('should keep non-string id as it', function() {
    const ObjectID = ds.connector.getDefaultIdType();
    const id = 123;
    ObjectID(id).should.be.equal(123);
  });

  context('strictObjectIDCoercion', function() {
    context('when set to false (default)', function() {
      const Article = ds.createModel(
        'ArticleA',
        {
          xid: String,
          title: String,
        },
      );

      beforeEach(function(done) {
        Article.deleteAll(done);
      });

      it('should save as ObjectID', async function() {
        await Article.create({xid: objectIDLikeString, title: 'abc'});
        const found = await Article.findOne({where: {title: 'abc'}});
        found.xid.should.be.an.instanceOf(ds.ObjectID);
      });
    });

    context('when set to true', function() {
      const Article = ds.createModel(
        'ArticleB',
        {
          xid: String,
          title: String,
        },
        {strictObjectIDCoercion: true},
      );

      beforeEach(function(done) {
        Article.deleteAll(done);
      });

      it('should not save as ObjectID', async function() {
        await Article.create({xid: objectIDLikeString, title: 'abc'});
        const found = await Article.findOne({where: {title: 'abc'}});
        found.xid.should.not.be.an.instanceOf(ds.ObjectID);
      });
    });
  });

  context("mongodb: {dataType: 'objectid'}", function() {
    const Article = ds.createModel(
      'ArticleC',
      {
        xid: {type: String, mongodb: {dataType: 'objectid'}},
        title: String,
      },
      {strictObjectIDCoercion: true},
    );

    beforeEach(function(done) {
      Article.deleteAll(done);
    });

    it('should throw if value is not an ObjectID-like string', async function() {
      try {
        await Article.create({xid: '', title: 'abc'});
      } catch (e) {
        e.message.should.match(/not an ObjectID string/);
      }
    });

    it('should save as ObjectID regardless of strictObjectIDCoercion: true', async function() {
      await Article.create({xid: objectIDLikeString, title: 'abc'});
      const found = await Article.findOne({where: {title: 'abc'}});
      found.xid.should.be.an.instanceOf(ds.ObjectID);
    });

    it('handles auto-generated PK properties defined in LB4 style', async () => {
      const Note = ds.createModel('NoteLB4', {
        id: {
          type: 'string',
          id: true,
          generated: true,
          mongodb: {dataType: 'ObjectID'},
        },
        title: {
          type: 'string',
          required: true,
        },
      });

      const result = await Note.create({title: 'hello'});
      // the test passes when this call does not throw
    });
  });
});
