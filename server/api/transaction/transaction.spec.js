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

describe('POST /api/transactions/trade/', function() {
    var loginToken;

    beforeEach(function(done) {
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
            db.TransactionApproval,
            db.Message
        ];
        testUtil.clearSequelizeTables(typesToClear,done);
    });

    beforeEach(function(done){
        var account1 = {
            email: 'test1@shadosports.com',
            password: 'test'
        };
        var account2 = {
            email: 'test2@shadosports.com',
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
        }).then(function(commishTeam){
            this.commishTeam = commishTeam;
            this.commishTeam.addUser(this.user1, {role: 'owner'});
            return this.commishTeam.save();
        }).then(function(){
            testUtil.loginUser(request(app),account1,function(token){
                loginToken = token;
                done();
            });
        })
    });

    it('should create an original trade with all transaction items and trade approvals', function(done) {
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

        var req = request(app).post('/api/transactions/trade/')
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
                res.body.seriesId.should.be.instanceof(Number);
                res.body.seriesId.should.equal(res.body.id);
                res.body.status.should.equal('pending');
                done();
            });
    });

    it('should create messages for the pending transaction approvals', function(done) {
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
            ],
            authorId: 1
        }

        var req = request(app).post('/api/transactions/trade/')
            .set('Authorization',"Bearer " + loginToken)
            .type('json')
            .send(transaction);

        req.expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                db.Message.findAll().then(function(messages){
                    messages.length.should.equal(2);
                    done();
                })
            });
    });


    it('should create a counteroffer trade with all transaction items and trade approvals', function(done) {
        var transaction1 = {
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
            ],
            authorId: 1
        };

        var transaction2 = {
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
            ],
            authorId: 2
        };

        var req = request(app).post('/api/transactions/trade/')
            .set('Authorization',"Bearer " + loginToken)
            .type('json')
            .send(transaction1);

        req.expect(201)
            .expect('Content-Type', /json/)
            .end(function(err, res1) {
                if (err) return done(err);
                res1.body.id.should.be.instanceof(Number);
                // We say 'this offer counteroffers Offer X' by setting this offer's series ID to Offer X's series ID
                transaction2.seriesId = res1.body.id;
                var req2 = request(app).post('/api/transactions/trade/')
                    .set('Authorization',"Bearer " + loginToken)
                    .type('json')
                    .send(transaction2);

                req2.expect(201)
                    .expect('Content-Type', /json/)
                    .end(function(err2, res2) {
                        if (err2) return done(err2);
                        res2.body.should.be.instanceof(Object);
                        res2.body.seriesId.should.be.instanceof(Number);
                        res2.body.seriesId.should.equal(res1.body.seriesId);

                        db.Transaction.find(res1.body.id).then(function(transaction1){
                            transaction1.status.should.equal('rejected');
                            transaction1.statusMessage.should.equal('Countered by Team 2')
                            done();
                        });
                    });
            });
    });
});


