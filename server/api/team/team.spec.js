'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');
var db = require('../models');

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
    db.Team.destroy({},{truncate: true}).success(function() {
      db.Player.destroy({}, {truncate: true}).success(function() {
        db.PlayerAssignment.destroy({}, {truncate: true}).success(function() {
        done();
        });
      });
    });
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
