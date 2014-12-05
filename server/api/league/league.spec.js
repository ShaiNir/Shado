'use strict';

var should = require('should');
var request = require('supertest');
var testUtil = require('../../components/test-util.js');
var db = require('../models');
var app =  require('../../app');

db.sequelize.sync();

var agent = request.agent(app);

describe('GET /api/leagues', function() {

  it('should respond with JSON array', function(done) {
    request(app)
      .get('/api/leagues')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
        res.body.should.be.instanceof(Array);
        done();
      });
  });
});


describe('GET /api/leagues/:id/teams', function() {
    var loginToken;

    before(function(done) {
        // Clear db before testing
        db.User.destroy({},{truncate: true}).success(function() {
            db.League.destroy({},{truncate: true}).success(function() {
                db.Team.destroy({},{truncate: true}).success(function() {
                    done();
                });
            });
        });
    });

    before(function(done){

        var account = {
            email: 'test@test.com',
            password: 'test'
        };

        db.User.create(account).success(function(user1){
            var pass = user1.password;
            return db.League.create({
                name: 'League',
                id: 1
            }).success(function(league1){
                return db.Team.create({
                    name: 'Team',
                    id: 1
                }).success(function(team1){
                    team1.setLeague(league1);
                    team1.addUser(user1, {role: 'owner'});
                    return team1.save();
                });
            });
        }).then(function(){
            testUtil.loginUser(request(app),account,function(token){
                loginToken = token;
                done();
            });
        });

    });

    it('should respond with JSON array', function(done) {
        var req = request(app).get('/api/leagues/1/teams')
            .set('Authorization',"Bearer " + loginToken);

        req.expect(200)
           .expect('Content-Type', /json/)
           .end(function(err, res) {
               if (err) return done(err);
               res.body.should.be.instanceof(Array);
               res.body.length.should.equal(1);
               done();
           });
    });
});

describe('GET /api/leagues/:id/rival_teams', function() {
    var loginToken;

    before(function(done) {
        // Clear db before testing
        db.User.destroy({},{truncate: true}).success(function() {
            db.League.destroy({},{truncate: true}).success(function() {
                db.Team.destroy({},{truncate: true}).success(function() {
                    done();
                });
            });
        });
    });

    before(function(done){

        var account1 = {
            email: 'test1@test.com',
            password: 'test'
        };
        var account2 = {
            email: 'test2@test.com',
            password: 'test'
        };

        db.User.create(account1);
        db.User.create(account2).success(function(user2){
            return db.League.create({
                name: 'League',
                id: 1
            }).success(function(league1){
                return db.Team.create({
                    name: 'Team',
                    id: 1
                }).success(function(team1){
                    team1.setLeague(league1);
                    team1.addUser(user2, {role: 'owner'});
                    return team1.save();
                });
            });
        }).then(function(){
            testUtil.loginUser(request(app),account2,function(token){
                loginToken = token;
                done();
            });
        });

    });

    it('should respond with JSON array', function(done) {
        var req = request(app).get('/api/leagues/1/rival_teams')
            .set('Authorization',"Bearer " + loginToken);

        req.expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.be.instanceof(Array);
                res.body.length.should.equal(1);
                res.body[0].Users.should.be.instanceof(Array);
                res.body[0].Users.length.should.equal(1);
                res.body[0].Users[0].profile.should.exist;
                // User should never include salt or hashedPassword
                (typeof res.body[0].Users[0].salt === 'undefined').should.be.true;
                (typeof res.body[0].Users[0].hashedPassword === 'undefined').should.be.true;
                done();
            });
    });
});

/*
Written by Sammy on 03/12/14
*/

describe('GET /api/leagues/:id/populate', function() {

    beforeEach(function(done) {
        // Clear db before testing
        db.League.destroy({},{truncate: true}).success(function() {
            db.Team.destroy({},{truncate: true}).success(function() {
            });
        });
        db.League.create({
            name: 'Test League',
            id: 1
        }).success(function(league1){
            for(var teamNumber = 1; teamNumber < 21; teamNumber ++) {
                db.Team.create({
                    name: 'Team ' + teamNumber,
                }).success(function(team) {
                    team.setLeague(league1);
                    team.save();
                });
            }
            db.Team.create({
                name: 'Commish Team',
                special: 'commish'
            }).success(function(team) {
                team.setLeague(league1);
                team.save();
            });
            db.Team.create({
                name: 'Free Agency Team',
                special: 'freeagency'
            }).success(function(team) {
                team.setLeague(league1);
                team.save();
            });
            done();
        })
    });

    it('should have created a league', function(done) {
        db.League.find(1).then(function() {
            done();
        });
    });

    it('should have made 22 teams', function(done) {
        db.Team.findAndCountAll([
        ]).success(function(result) {
            result.count.should.equal(22);
            done();
        });
    });

});
