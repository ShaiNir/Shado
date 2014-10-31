/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var LeagueSetting = require('../models').LeagueSetting;

exports.register = function(socket) {
  LeagueSetting.afterCreate(function (league_setting) {
      onSave(socket, league_setting);
  });
  LeagueSetting.afterUpdate(function (league_setting) {
      onSave(socket, league_setting);
  });
  LeagueSetting.afterDestroy(function (league_setting) {
    onRemove(socket, league_setting);
  });
}

function onSave(socket, league_setting, cb) {
  socket.emit('league_setting:save', league_setting);
}

function onRemove(socket, league_setting, cb) {
  socket.emit('league_setting:remove', league_setting);
}
