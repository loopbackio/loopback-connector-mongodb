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

describe.only('non-ObjectID id property', function() {

  context('auto-generated id', () => {
    const User = ds.createModel('User', {
      id: {type: 'string', id: true, generated: true },
      email: {type: 'string'}
    });

    beforeEach(async () => {
      await User.deleteAll();
    });

    it('should generate non-ObjectID id property', async () => {
      const user = await User.create({name: 'Carra'});
      const found = await User.findById(user.id);
      // fails as id is returned as ObjectID, .eql(found.id) passes as expected
      user.id.should.equal(found.id);
    });

    it('should throw if id is specified', async () => {
      await User.create({id: 'a', name: 'Carro'}).should.be.rejected();
    });
  });

  context('specified id', () => {
    const User = ds.createModel('User', {
      id: {type: 'string', id: true},
      email: {type: 'string'}
    });

    beforeEach(async () => {
      await User.deleteAll();
    });

    it('should use non-ObjectID id property', async () => {
      const user = await User.create({id: 'a', name: 'Carro'});
      const found = await User.findById(user.id);
      user.id.should.equal(found.id);
    });

    // bug
    it('should throw if id is not specified', async () => {
      await User.create({name: 'Carro'}).should.be.rejected();
    });
  });

});
