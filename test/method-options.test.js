// Copyright IBM Corp. 2013,2020. All Rights Reserved.
// Node module: loopback-connector-mongodb
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const {expectation} = require('sinon');

require('./init.js');

let Game;
const ds = global.getDataSource();

describe('method level options', function() {
  before(function() {
    Game = ds.define('Game');
  });

  it('should create and update an item with a field containing a JSON with a property using `.` '
    , async function() {
      const player = await Game.create({playerInfo: {
        'player.lives': 1,
        'player.number': 1}, title: 'abc'}, {checkKeys: false});
      const playerData = player.toObject();
      playerData.playerInfo = {
        'player.lives': 2,
        'player.number': 2};
      await Game.update(playerData);
      const lastGame = await Game.findOne({_id: player.id});
      lastGame.playerInfo.should.be.eql({
        'player.lives': 2,
        'player.number': 2});
    });
});
