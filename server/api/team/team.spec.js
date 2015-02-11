'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');
var db = require('../models');
var testUtil = require('../../components/test-util.js');

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
  var testTeam = ""

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
    }).then(function(team) {
      testTeam = team;
      return db.Player.create({
        name: 'Rodger Umaechi',
        id: 1
      })
    }).then(function(player) {
      return player.addTeam(testTeam);
    }).then(function(player) {
      return player.save()
    }).then(function() {
      done();
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
