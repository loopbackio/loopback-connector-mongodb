var memwatch = require('memwatch-next');
var Todo = require('./fixtures/todo');

describe('mongodb', function() {
  before(function() {
    this.spy = sinon.spy();
    memwatch.on('leak', this.spy);
  });

  after(function(done) {
    Todo.destroyAll(done);
  });

  function resetTestState(ctx, cb) {
    ctx.spy.reset();
    ctx.iterations = 0;
    Todo.destroyAll(cb);
  }

  function execute(ctx, func, options, done) {
    var hasOptions = true;
    if (typeof options === 'function') {
      done = options;
      hasOptions = false;
    }
    var interval = setInterval(function() {
      if (ctx.iterations >= ITERATIONS || ctx.spy.called) {
        ctx.spy.called.should.be.false;
        clearInterval(interval);
        return done();
      }
      ctx.iterations++;
      hasOptions ? Todo[func](options) : Todo[func];
    }, 0);
  }

  context('find', function() {
    beforeEach(function(done) {
      resetTestState(this, done);
    });

    beforeEach(function createFixtures(done) {
      Todo.create([
        {content: 'Buy eggs'},
        {content: 'Buy milk'},
        {content: 'Buy cheese'}
      ], done);
    });

    it('should not leak when retrieving a specific item', function(done) {
      execute(this, 'find', {where: {content: 'Buy eggs'}}, done);
    });

    it('should not leak when retrieving all items', function(done) {
      execute(this, 'find', done);
    });
  });

  context('create', function() {
    beforeEach(function(done) {
      resetTestState(this, done);
    });

    it('should not leak when creating an item', function(done) {
      execute(this, 'create', {content: 'Buy eggs'}, done);
    });

    it('should not leak when creating multiple items', function(done) {
      execute(this, 'create', [
        {content: 'Buy eggs'},
        {content: 'Buy milk'},
        {content: 'Buy cheese'}
      ], done);
    });
  });
});
