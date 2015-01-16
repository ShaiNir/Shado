'use strict';

var should = require('should');
var request = require('supertest');
var testUtil = require('../../components/test-util.js');
var db = require('../models');
var app =  require('../../app');
var BPromise = require("sequelize/node_modules/bluebird");
var _ = require('lodash');

db.sequelize.sync();

var setupLeagueWithUsers = function(){
    return BPromise.bind({}).then(function(){
        return db.League.create({
            name: 'League',
            id: 1
        })
    }).then(function(league){
        this.league = league;
        this.account1 = {
            email: 'test1@shadosports.com',
            password: 'test'
        };
        return db.User.create(this.account1)
    }).then(function(user1){
        this.user1 = user1;
        return db.Team.create({
            name: 'Team 1',
            LeagueId: this.league.id,
            id: 1,
            budget:1000
        })
    }).then(function(team1){
        this.team1 = team1;
        return db.Player.create({
            name: 'Player 1',
            salary: 10000,
            id: 1
        })
    }).then(function(player1){
        this.player1 = player1;
        this.team1.addPlayer(player1, {status: 'inactive'});
        this.team1.addUser(this.user1, {role: 'owner'});
        return this.team1.save();
    }).then(function(team1){
        this.team1 = team1;
        this.account2 = {
            email: 'test2@shadosports.com',
            password: 'test'
        };
        return db.User.create(this.account2);
    }).then(function(user2){
        this.user2 = user2;
        return db.Team.create({
            name: 'Team 2',
            LeagueId: this.league.id,
            id: 2,
            budget:1000
        })
    }).then(function(team2){
        this.team2 = team2;
        return db.Player.create({
            name: 'Player 2',
            salary: 20000,
            id: 2
        })
    }).then(function(player2){
        this.player2 = player2;
        this.team2.addPlayer(player2, {status: 'inactive'});
        this.team2.addUser(this.user2, {role: 'owner'});
        return this.team2.save();
    }).then(function(team2){
        this.team2 = team2;
        return db.Team.create({
            name: 'Commish',
            LeagueId: this.league.id,
            special: 'commish',
            id: 3
        })
    }).then(function(commish){
        this.commish = commish;
        this.commish.addUser(this.user1, {role: 'owner'});
        return this.commish.save();
    }).then(function(commish){
        this.commish = commish;
        return this;
    })
}

var setUpTrade = function(){
    return setupLeagueWithUsers().then(function() {
            var transactionInfo = {
                type: 'trade',
                LeagueId: this.league.id,
                authorId: this.team1.id,
                status: 'pending'
            }
            return db.Transaction.create(transactionInfo);
        }).then(function (transaction) {
            this.transaction = transaction;
            var items = [
                {
                    assetType: 'Player',
                    asset: this.player1.id,
                    sourceId: this.team1.id,
                    destinationId: this.team2.id,
                    TransactionId: this.transaction.id
                },
                {
                    assetType: 'Player',
                    asset: this.player2.id,
                    sourceId: this.team2.id,
                    destinationId: this.team1.id,
                    TransactionId: this.transaction.id
                },
                {
                    assetType: 'Budget',
                    asset: (this.team2.budget / 2),
                    sourceId: this.team2.id,
                    destinationId: this.team1.id,
                    TransactionId: this.transaction.id
                }
            ];
            return db.TransactionItem.bulkCreate(items)
        }).then(function() {
        var approvalInfo = [
            {
                "TeamId": this.team1.id,
                "role": "participant",
                "status": "approved",
                "TransactionId": this.transaction.id
            },
            {
                "TeamId": this.team2.id,
                "role": "participant",
                "status": "pending",
                "TransactionId": this.transaction.id
            },
            {
                "TeamId": this.commish.id,
                "role": "commish",
                "status": "pending",
                "TransactionId": this.transaction.id
            }
        ]
        return db.TransactionApproval.bulkCreate(approvalInfo)
    }).then(function (approvals) {
        this.transactionApprovals = _.indexBy(approvals,'TeamId');
        return this;
    })
}

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
        setupLeagueWithUsers().then(function(){
            testUtil.loginUser(request(app), this.account1,function(token){
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


    it('should reject a transaction item with missing information', function(done) {
        var transaction = {
            LeagueId: 1,
            type: 'trade',
            TransactionItems: [
                {
                    assetType: 'Player',
                    asset: 1,
                    destinationId: 1
                }
            ]
        }

        var req = request(app).post('/api/transactions/trade/')
            .set('Authorization',"Bearer " + loginToken)
            .type('json')
            .send(transaction);

        req.expect(500)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.be.instanceof(Array);
                res.body[0].should.be.instanceof(String);
                res.body[0].toLowerCase().indexOf('source').should.be.greaterThan(-1);
                done();
            });
    });

    it('should reject a transaction item in which the source team does not own the asset', function(done) {
        var transaction = {
            LeagueId: 1,
            type: 'trade',
            TransactionItems: [
                {
                    assetType: 'Player',
                    asset: 1,
                    sourceId: 2,
                    destinationId: 1
                }
            ]
        }

        var req = request(app).post('/api/transactions/trade/')
            .set('Authorization',"Bearer " + loginToken)
            .type('json')
            .send(transaction);

        req.expect(500)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.be.instanceof(Array);
                res.body[0].should.be.instanceof(String);
                res.body[0].toLowerCase().indexOf('player').should.be.greaterThan(-1);
                done();
            });
    });

});





describe('POST /api/transactions/:id/approve', function() {
    var user1Token;
    var user2Token;
    var models;

    beforeEach(function(done){
        // Clear db before testing
        var typesToClear = [
            db.Sport,
            db.User,
            db.Stake,
            db.Team,
            db.League,
            db.Player,
            db.PlayerAssignment,
            db.Transaction,
            db.TransactionItem,
            db.TransactionApproval
        ];
        testUtil.clearSequelizeTables(typesToClear,done);
    })

    beforeEach(function(done){
        setUpTrade().then(function(){
            models = this;
            testUtil.loginUser(request(app), models.account1,function(token){
                user1Token = token;
                testUtil.loginUser(request(app), models.account2,function(token){
                    user2Token = token;
                    done();
                });
            });
        })
    })

    it('should approve a pending trade correctly', function(done){
        var requestBody = {TeamId: models.team2.id, isApproved: true}

        var req = request(app).post('/api/transactions/' + models.transaction.id + '/approve/')
            .set('Authorization',"Bearer " + user2Token)
            .type('json')
            .send(requestBody);

        req.expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                var approvalQuery = {where:{TransactionId: models.transaction.id, TeamId: models.team2.id}}
                db.TransactionApproval.findOne(approvalQuery).then(function(approval){
                    approval.status.should.equal('approved')
                    done();
                })
            });
    })

    it('should reject a pending trade correctly', function(done){
        var requestBody = {TeamId: models.team2.id, isApproved: false}

        var req = request(app).post('/api/transactions/' + models.transaction.id + '/approve/')
            .set('Authorization',"Bearer " + user2Token)
            .type('json')
            .send(requestBody);

        req.expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                var approvalQuery = {where:{TransactionId: models.transaction.id, TeamId: models.team2.id}}
                db.TransactionApproval.findOne(approvalQuery).then(function(approval){
                    approval.status.should.equal('rejected')
                    done();
                })
            });
    })

    it('should reject an approved trade correctly', function(done){
        var requestBody = {TeamId: models.team1.id, isApproved: false}

        var req = request(app).post('/api/transactions/' + models.transaction.id + '/approve/')
            .set('Authorization',"Bearer " + user1Token)
            .type('json')
            .send(requestBody);

        req.expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                var approvalQuery = {where:{TransactionId: models.transaction.id, TeamId: models.team1.id}}
                db.TransactionApproval.findOne(approvalQuery).then(function(approval){
                    approval.status.should.equal('rejected')
                    done();
                })
            });
    })


    it('should not allow a user to approve a trade for a team that user doesn\'t belong to', function(done){
        var requestBody = {TeamId: models.commish.id, isApproved: true}

        var req = request(app).post('/api/transactions/' + models.transaction.id + '/approve/')
            .set('Authorization',"Bearer " + user2Token)
            .type('json')
            .send(requestBody);

        req.expect(403)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
    })
})