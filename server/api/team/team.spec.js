'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');
var db = require('../models');
var testUtil = require('../../components/test-util.js');

var fillTest = require('../../components/fill_teams_test.js');

db.sequelize.sync();

describe('GET /api/teams', function() {

  it('should respond with JSON array', function(done) {
    request(app)
      .get('/api/teams')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
        res.body.should.be.instanceof(Array);
        done();
      });
  });
});

describe('GET /api/teams/:id/players', function() {

  before(function(done) {
      // Clear db before testing
      var typesToClear = [
          db.Team,
          db.Player,
          db.PlayerAssignment
      ];
      testUtil.clearSequelizeTables(typesToClear,done);
  });

  before(function(done) {
    db.Team.create({
      name: 'Albany Alphas',
      id: 1
    }).success(function(team1){
      db.Player.create({
        name: 'Rodger Umaechi',
        id: 1
      }).success(function(player1){
        player1.addTeam(team1);
        player1.save().success(function(){
            done();
        });
      });
    });
  });

  it('should respond with JSON array', function(done) {
    var req = request(app).get('/api/teams/1/players')

    req.expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
          res.body.should.be.instanceof(Array);
          done();
      });
  });
});


describe ('POST /api/teams/fill', function() {
  var account1 = {
        email: 'test1@test.com',
        password: 'test',
        role: 'admin'
  };

  before(function(done) {
    // Clear db before testing
    db.User.destroy({}, {truncate: true}).then(function() {
      return db.Team.destroy({}, {truncate: true})
    }).then(function() {
      return db.Player.destroy({}, {truncate: true})
    }).then(function() {
      return db.PlayerAssignment.destroy({}, {truncate: true})
    }).then(function() {
      done();
    });
  });

  before(function(done) {
    db.User.create(account1).then(function(adminUser) {
      return fillTest.fillTeams(adminUser);
    }).then(function() {
     done();
    });
  });

  it('should have prepared 4 teams', function(done) {
    db.Team.findAndCountAll().then(function(result) {
      return result.count.should.equal(4);
    }).then(function() {
      done();
    });
  });

});
