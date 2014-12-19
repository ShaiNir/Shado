'use strict';

var should = require('should');
var request = require('supertest');
var testUtil = require('../../components/test-util.js');
var db = require('../models');
var app =  require('../../app');
var Promise = require("sequelize/node_modules/bluebird");

db.sequelize.sync();

describe('GET /api/transactions', function() {

  it('should respond with JSON array', function(done) {
    request(app)
      .get('/api/transactions')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
        res.body.should.be.instanceof(Array);
        done();
      });
  });
});

describe('POST /api/transactions', function() {
    var loginToken;

    before(function(done) {
        // Clear db before testing
        var typesToClear = [
            db.Sport,
            db.User,
            db.Team,
            db.League,
            db.Player,
            db.PlayerAssignment,
            db.Transaction,
            db.TransactionItem,
            db.TransactionApproval
        ];
        testUtil.clearSequelizeTables(typesToClear,done);
    });
/*
    before(function(done){

        var account1 = {
            email: 'test1@test.com',
            password: 'test'
        };
        var account2 = {
            email: 'test2@test.com',
            password: 'test'
        };

        db.League.create({
            name: 'League',
            id: 1
        }).success(function(league1){
            db.User.create(account1).success(function(user1){
                db.Team.create({
                    name: 'Team',
                    id: 1
                }).success(function(team1){
                    team1.setLeague(league1);
                    team1.addUser(user1, {role: 'owner'});
                    team1.save().success(function(){
                        db.Player.create({
                            name: 'Player 1',
                            salary: 10000,
                            id: 1
                        }).success(function(player1){
                            team1.addPlayer(player1, {status: 'inactive'});
                            team1.save().success(function(){
                                db.User.create(account2).success(function(user2){
                                    db.Team.create({
                                        name: 'Team',
                                        id: 2
                                    }).success(function(team2){
                                        team2.setLeague(league1);
                                        team2.addUser(user2, {role: 'owner'});
                                        team2.save().success(function(){
                                            db.Player.create({
                                                name: 'Player 2',
                                                salary: 20000,
                                                id: 2
                                            }).success(function(player2){
                                                team2.addPlayer(player2, {status: 'inactive'});
                                                team2.save().success(function(){
                                                    testUtil.loginUser(request(app),account1,function(token){
                                                        loginToken = token;
                                                        done();
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
*/
    before(function(done){
        var account1 = {
            email: 'test1@test.com',
            password: 'test'
        };
        var account2 = {
            email: 'test2@test.com',
            password: 'test'
        };

        Promise.bind({}).then(function(){
            return db.League.create({
                name: 'League',
                id: 1
            })
        }).then(function(league){
            this.league = league;
            return db.User.create(account1)
        }).then(function(user1){
            this.user1 = user1;
            return db.Team.create({
                name: 'Team 1',
                LeagueId: this.league.id,
                id: 1
            })
        }).then(function(team1){
            this.team1 = team1;
            return db.Player.create({
                name: 'Player 1',
                salary: 10000,
                id: 1
            })
        }).then(function(player1){
            this.team1.addPlayer(player1, {status: 'inactive'});
            this.team1.addUser(this.user1, {role: 'owner'});
            return this.team1.save();
        }).then(function(){
            return db.User.create(account2);
        }).then(function(user2){
            this.user2 = user2;
            return db.Team.create({
                name: 'Team 2',
                LeagueId: this.league.id,
                id: 2
            })
        }).then(function(team2){
            this.team2 = team2;
            return db.Player.create({
                name: 'Player 2',
                salary: 20000,
                id: 2
            })
        }).then(function(player2){
            this.team2.addPlayer(player2, {status: 'inactive'});
            this.team2.addUser(this.user2, {role: 'owner'});
            return this.team2.save();
        }).then(function(){
            return db.Team.create({
                name: 'Commish',
                LeagueId: this.league.id,
                special: 'commish',
                id: 3
            })
        }).then(function(){
            testUtil.loginUser(request(app),account1,function(token){
                loginToken = token;
                done();
            });
        })
    });

    it('should respond with a full trade', function(done) {
        var transaction = {
            LeagueId: 1,
            type: 'trade',
            TransactionItems: [
                {
                    assetType: 'Player',
                    asset: 1,
                    sourceId: 1,
                    destinationId: 2
                },
                {
                    assetType: 'Player',
                    asset: 2,
                    sourceId: 2,
                    destinationId: 1
                }
            ]
        }

        var req = request(app).post('/api/transactions')
            .set('Authorization',"Bearer " + loginToken)
            .type('json')
            .send(transaction);

        req.expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.be.instanceof(Object);
                res.body.LeagueId.should.exist;
                res.body.TransactionItems.should.be.instanceof(Array);
                res.body.TransactionItems.length.should.equal(2);
                res.body.TransactionApprovals.should.be.instanceof(Array);
                res.body.TransactionApprovals.length.should.equal(3);
                done();
            });
    });
});


