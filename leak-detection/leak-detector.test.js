// Copyright IBM Corp. 2015,2019. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

let memwatch;

try {
  memwatch = require('@airbnb/node-memwatch');
} catch (e) {
  memwatch = require('memwatch-next');
}
const sinon = require('sinon');

describe('leak detector', function() {
  before(function() {
    this.spy = sinon.spy();
    memwatch.on('leak', this.spy);
  });

  it('should detect a basic leak', function(done) {
    const test = this;
    const iterations = 0;
    const leaks = [];
    const interval = setInterval(function() {
      if (test.iterations >= global.ITERATIONS || test.spy.called) {
        test.spy.called.should.be.True();
        clearInterval(interval);
        return done();
      }
      test.iterations++;
      for (let i = 0; i < 1000000; i++) {
        const str = 'leaky string';
        leaks.push(str);
      }
    }, 0);
  });
});
