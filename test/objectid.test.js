require('./init.js');

var db, Book, Chapter;

describe('ObjectID', function () {

  before(function () {
    db = getDataSource();
    Book = db.define('Book');
    Chapter = db.define('Chapter');
    Book.hasMany('chapters');
    Chapter.belongsTo('book');
  });

  it('should cast foreign keys as ObjectID', function (done) {

    Chapter.beforeCreate = function (next, data) {
      data.bookId.should.be.an.instanceOf(db.ObjectID);
      this.bookId.should.be.an.instanceOf(db.ObjectID);
      next();
    };

    Book.create(function (err, book) {
      Chapter.create({bookId: book.id.toString()}, done);
    });

  });

  it('should convert 24 byte hex string as ObjectID', function () {
    var ObjectID = db.connector.getDefaultIdType();
    var str = '52fcef5c0325ace8dcb7a0bd';
    ObjectID(str).should.be.an.instanceOf(db.ObjectID);
  });

  it('should not convert 12 byte string as ObjectID', function () {
    var ObjectID = db.connector.getDefaultIdType();
    var str = 'line-by-line';
    ObjectID(str).should.be.equal(str);
  });

  it('should keep mongodb ObjectID as is', function () {
    var ObjectID = db.connector.getDefaultIdType();
    var id = new db.ObjectID();
    ObjectID(id).should.be.an.instanceOf(db.ObjectID);
  });

  it('should keep non-string id as it', function () {
    var ObjectID = db.connector.getDefaultIdType();
    var id = 123;
    ObjectID(id).should.be.equal(123);
  });

});
