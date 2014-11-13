/**
 * Populate DB with sample data on server start
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';
var User = require('../api/models').User;

User.destroy({where:['email in (?,?)','test@test.com','admin@admin.com']},{truncate: true}).then(function(){
  User.bulkCreate([{
    provider: 'local',
    role: 'manager',
    name: 'Test User',
    email: 'test@test.com',
    password: 'test'
  }, {
    provider: 'local',
    role: 'admin',
    name: 'Admin',
    email: 'admin@admin.com',
    password: 'admin'
  }]).then(function() {
      console.log('finished populating users');
  });
});