'use strict';

var should = require('should');
var db =  require('../models');
var TransactionHelper = require('../transaction/transaction.helper');
var BPromise = require("sequelize/node_modules/bluebird");
var _ = require('lodash');
var testUtil = require('../../components/test-util.js');

db.sequelize.sync();

// Returns a promise with a context containing all the models
var setUpLeague = function(){
    return BPromise.bind({}).then(function(){
        return db.League.create();
    }).then(function(league){
        this.league = league;
        return db.Team.create({name: "Commish", LeagueId: this.league.id, special: 'commish'});
    }).then(function(commish){
        this.commish = commish;
        return db.Team.create({name: "Team 1", LeagueId: this.league.id, budget: 1000});
    }).then(function(team1){
        this.team1 = team1;
        return db.Team.create({name: "Team 2", LeagueId: this.league.id, budget: 1000});
    }).then(function(team2){
        this.team2 = team2;
        return db.Player.create({name: "Player 1"});
    }).then(function(player1){
        this.player1 = player1;
        this.team1.addPlayer(player1, {status: 'active'});
        return this.team1.save();
    }).then(function(team1){
        this.team1 = team1;
        return db.Player.create({name: "Player 2"});
    }).then(function(player2){
        this.player2 = player2;
        this.team2.addPlayer(player2, {status: 'active'});
        return this.team2.save();
    }).then(function(team2){
        this.team2 = team2;
        return this;
    })
};

var setUpSimpleTrade = function(){
    return setUpLeague().then(function() {
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
    }).then(function (transactionItems) {
        this.transactionItems = transactionItems;
        return this;
    });
}

var setUpTradeApprovals = function(){
    return setUpSimpleTrade().then(function() {
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

describe('Transaction Helper', function() {
    beforeEach(function(done) {
        // Clear db before testing
        var typesToClear = [
            db.Team,
            db.League,
            db.LeagueSetting,
            db.Player,
            db.PlayerAssignment,
            db.Transaction,
            db.TransactionItem,
            db.TransactionApproval
        ];
        testUtil.clearSequelizeTables(typesToClear,done);
    });

    it('should create team transaction approvals', function(done) {
        setUpSimpleTrade().then(function (su) {
            TransactionHelper.createAssetOwnerApprovals(su.transaction.id).then(function (approvals) {
                approvals.should.be.instanceOf(Array);
                approvals.length.should.equal(2);
                var teamIds = [su.team1.id, su.team2.id];
                var approvalTeamIds = [approvals[0].TeamId, approvals[1].TeamId];
                _.min(approvalTeamIds).should.equal(_.min(teamIds));
                _.max(approvalTeamIds).should.equal(_.max(teamIds));
                if (approvals[0].TeamId == su.team1.id) {
                    approvals[0].status.should.equal('approved');
                    approvals[1].status.should.equal('pending');
                } else {
                    approvals[0].status.should.equal('pending');
                    approvals[1].status.should.equal('approved');
                }
                done();
            });
        });
    });

    it('should create a commish transaction approval', function(done) {
        setUpSimpleTrade().then(function (su) {
            var commishSetting = {LeagueId: su.league.id, key: 'TRADE_COMMISH_AUTO_APPROVE', value: 'false'};
            db.LeagueSetting.create(commishSetting).then(function () {
                TransactionHelper.createCommishApproval(su.transaction.id).then(function (approval) {
                    approval.should.be.instanceOf(Object);
                    approval.TeamId.should.equal(su.commish.id);
                    approval.status.should.equal('pending');
                    done();
                });
            });
        });
    });

    it('should create a commish transaction approval with auto-approval', function(done) {
        setUpSimpleTrade().then(function (su) {
            var commishSetting = {LeagueId: su.league.id, key: 'TRADE_COMMISH_AUTO_APPROVE', value: 'true'};
            db.LeagueSetting.create(commishSetting).then(function () {
                TransactionHelper.createCommishApproval(su.transaction.id).then(function (approval) {
                    approval.should.be.instanceOf(Object);
                    approval.TeamId.should.equal(su.commish.id);
                    approval.status.should.equal('approved');
                    done();
                });
            });
        });
    });
})

describe('Verify Asset Owner', function(){
    beforeEach(function(done) {
        // Clear db before testing
        var typesToClear = [
            db.Team,
            db.League,
            db.LeagueSetting,
            db.Player,
            db.PlayerAssignment,
            db.Transaction,
            db.TransactionItem,
            db.TransactionApproval
        ];
        testUtil.clearSequelizeTables(typesToClear,done);
    });

    it('should pass a valid transaction', function(done){
        setUpLeague().then(function(){
            var items = [
                {
                    assetType: 'Player',
                    asset: this.player1.id,
                    sourceId: this.team1.id,
                    destinationId: this.team2.id
                },
                {
                    assetType: 'Player',
                    asset: this.player2.id,
                    sourceId: this.team2.id,
                    destinationId: this.team1.id
                },
                {
                    assetType: 'Budget',
                    asset: (this.team2.budget / 2),
                    sourceId: this.team2.id,
                    destinationId: this.team1.id
                }
            ];
            return TransactionHelper.verifyAssetOwners(items);
        }).then(function(errors) {
            errors.should.be.instanceOf(Array);
            errors.length.should.equal(0);
            done()
        });
    });

    it('should fail an invalid transaction with a player improperly assigned', function(done){
        setUpLeague().then(function(){
            var items = [
                {
                    assetType: 'Player',
                    asset: this.player2.id,
                    sourceId: this.team1.id,
                    destinationId: this.team2.id
                }
            ];
            return TransactionHelper.verifyAssetOwners(items);
        }).then(function(errors) {
            errors.length.should.equal(1);
            errors[0].should.be.instanceOf(String);
            errors[0].indexOf('player').should.be.greaterThan(-1);
            done()
        });
    });

    it('should also fail an invalid transaction with too much budget charged to one team', function(done){
        setUpLeague().then(function(){
            var items = [
                {
                    assetType: 'Player',
                    asset: this.player2.id,
                    sourceId: this.team1.id,
                    destinationId: this.team2.id
                },
                {
                    assetType: 'Budget',
                    asset: (this.team2.budget * 2),
                    sourceId: this.team2.id,
                    destinationId: this.team1.id
                }
            ];
            return TransactionHelper.verifyAssetOwners(items);
        }).then(function(errors) {
            errors.length.should.equal(2);
            errors[0].should.be.instanceOf(String);
            errors[0].indexOf('player').should.be.greaterThan(-1);
            errors[1].should.be.instanceOf(String);
            errors[1].indexOf('budget').should.be.greaterThan(-1);
            done()
        });
    });
})


describe('approveOrReject', function() {
    beforeEach(function (done) {
        // Clear db before testing
        var typesToClear = [
            db.Team,
            db.League,
            db.LeagueSetting,
            db.Player,
            db.PlayerAssignment,
            db.Transaction,
            db.TransactionItem,
            db.TransactionApproval
        ];
        testUtil.clearSequelizeTables(typesToClear, done);
    });

    it('should correctly accept a trade', function (done) {
        setUpTradeApprovals().then(function(){
            return TransactionHelper.approveOrReject(this.transaction.id, this.team2.id, true);
        }).then(function(approval){
            approval.status.should.equal('approved');
            approval.TeamId.should.equal(this.team2.id);
            done();
        })
    })

    it('should correctly reject a trade', function (done) {
        setUpTradeApprovals().then(function(){
            return TransactionHelper.approveOrReject(this.transaction.id, this.commish.id, false);
        }).then(function(approval){
            approval.status.should.equal('rejected');
            approval.TeamId.should.equal(this.commish.id);
            done();
        })
    })
})


describe('transact', function(){
    beforeEach(function (done) {
        // Clear db before testing
        var typesToClear = [
            db.Team,
            db.League,
            db.LeagueSetting,
            db.Player,
            db.PlayerAssignment,
            db.Transaction,
            db.TransactionItem,
            db.TransactionApproval
        ];
        testUtil.clearSequelizeTables(typesToClear, done);
    });

    it('should correctly switch asset ownership', function(done){
        setUpSimpleTrade().then(function() {
            return TransactionHelper.transact(this.transaction.id)
        }).then(function(){
            var leagueQuery = {
                where: {id: this.league.id},
                include: [{
                    model: db.Team,
                    include: db.Player
                }]
            }
            return db.League.find(leagueQuery)
        }).then(function(resultLeague){
            var team1 = _.find(resultLeague.Teams, {name: this.team1.name})
            var team2 = _.find(resultLeague.Teams, {name: this.team2.name})
            team1.Players.length.should.equal(1);
            team1.Players[0].id.should.equal(this.player2.id);
            team1.Players[0].PlayerAssignment.status.should.equal('inactive');
            team1.budget.should.equal(1500);
            team2.Players.length.should.equal(1);
            team2.Players[0].id.should.equal(this.player1.id);
            team2.Players[0].PlayerAssignment.status.should.equal('inactive');
            team2.budget.should.equal(500);
            done()
        })
    })

    it('should correctly mark the transaction as complete', function(done) {
        setUpSimpleTrade().then(function () {
            return TransactionHelper.transact(this.transaction.id)
        }).then(function () {
            return db.Transaction.find(this.transaction.id)
        }).then(function (resultTransaction) {
            resultTransaction.status.should.equal('completed');
            done()
        })
    })


    it('should cancel a different transaction where a team trading a player away no longer owns that player', function(done){
        setUpSimpleTrade().then(function(){
            var otherTradeInfo = {
                type: 'trade',
                LeagueId: this.league.id,
                authorId: this.team1.id,
                status: 'pending'
            }
            return db.Transaction.create(otherTradeInfo);
        }).then(function (otherTrade) {
            this.otherTrade = otherTrade;
            var items = [
                {
                    assetType: 'Player',
                    asset: this.player1.id,
                    sourceId: this.team1.id,
                    destinationId: this.team2.id,
                    TransactionId: this.otherTrade.id
                },
                {
                    assetType: 'Player',
                    asset: this.player2.id,
                    sourceId: this.team2.id,
                    destinationId: this.team1.id,
                    TransactionId: this.otherTrade.id
                }
            ];
            return db.TransactionItem.bulkCreate(items)
        }).then(function (otherTradeItems) {
            this.otherTradeItems = otherTradeItems;
        }).then(function(){
            return TransactionHelper.transact(this.transaction.id)
        }).then(function(){
            return db.Transaction.find(this.otherTrade.id)
        }).then(function(resultOtherTrade){
            resultOtherTrade.status.should.equal('rejected');
            done();
        })
    })

})

describe('rejectTransactionsOverBudgetForTeam', function(){
    beforeEach(function (done) {
        // Clear db before testing
        var typesToClear = [
            db.Team,
            db.League,
            db.LeagueSetting,
            db.Player,
            db.PlayerAssignment,
            db.Transaction,
            db.TransactionItem,
            db.TransactionApproval
        ];
        testUtil.clearSequelizeTables(typesToClear, done);
    });

    it('should mark a transaction above budget as rejected', function(done) {
        setUpSimpleTrade().then(function () {
            this.team2.budget = this.team2.budget / 4;
            return this.team2.save()
        }).then(function(team2) {
            this.team2 = team2;
            return TransactionHelper.rejectTransactionsOverBudgetForTeam(this.team2.id)
        }).then(function () {
            return db.Transaction.find(this.transaction.id)
        }).then(function (resultTransaction) {
            resultTransaction.status.should.equal('rejected');
            (resultTransaction.statusMessage.indexOf('udget') > 0).should.be.true;
            done()
        })
    })

    it('should not mark a transaction within budget as rejected', function(done) {
        setUpSimpleTrade().then(function () {
            return TransactionHelper.rejectTransactionsOverBudgetForTeam(this.team2.id)
        }).then(function () {
            return db.Transaction.find(this.transaction.id)
        }).then(function (resultTransaction) {
            resultTransaction.status.should.equal('pending');
            done()
        })
    })

})



describe('isApproved', function() {
    beforeEach(function (done) {
        // Clear db before testing
        var typesToClear = [
            db.Team,
            db.League,
            db.LeagueSetting,
            db.Player,
            db.PlayerAssignment,
            db.Transaction,
            db.TransactionItem,
            db.TransactionApproval
        ];
        testUtil.clearSequelizeTables(typesToClear, done);
    });

    it('should not mark a transaction as accepted if not all of its approval requests are approved', function(done) {
        setUpTradeApprovals().then(function(){
            return TransactionHelper.isApproved(this.transaction.id)
        }).then(function (approved) {
            approved.should.be.false;
            done()
        })
    })

    it('should mark a transaction as accepted if all of its approval requests are approved', function(done) {
        setUpTradeApprovals().then(function(){
            return db.TransactionApproval.update(
                {status: 'approved'},
                {where: {TransactionId: this.transaction.id}}
            )
        }).then(function(apps){
            return TransactionHelper.isApproved(this.transaction.id)
        }).then(function (approved) {
            approved.should.be.true;
            done()
        })
    })

})