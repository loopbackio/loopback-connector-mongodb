require('./init.js');

var db, Book, Chapter;

describe('ObjectID', function() {

    before(function() {
        db = getDataSource();
        Book = db.define('Book');
        Chapter = db.define('Chapter');
        Book.hasMany('chapters');
        Chapter.belongsTo('book');
    });

    it('should cast foreign keys as ObjectID', function(done) {

        Chapter.beforeCreate = function(next, data) {
            data.bookId.should.be.an.instanceOf(db.ObjectID);
            this.bookId.should.be.an.instanceOf(db.ObjectID);
            next();
        };

        Book.create(function(err, book) {
            Chapter.create({bookId: book.id.toString()}, done);
        });

    });
});
