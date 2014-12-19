'use strict';

var should = require('should');
var db =  require('../models');
var TransactionHelper = require('../transaction/transaction.helper');
var Promise = require("sequelize/node_modules/bluebird");
var _ = require('lodash');
var testUtil = require('../../components/test-util.js');

db.sequelize.sync();

var setUpLeague= function(done){
    db.League.create().then(function(league){
        db.Team.create({name: "Commish", LeagueId: league.id, special: 'commish'}).then(function(commish){
            db.Team.create({name: "Team 1", LeagueId: league.id}).then(function(team1){
                db.Team.create({name: "Team 2", LeagueId: league.id}).then(function(team2){
                    db.Player.create({name: "Player 1"}).then(function(player1){
                        team1.addPlayer(player1, {status: 'active'});
                        team1.save().then(function(){
                            db.Player.create({name: "Player 2"}).then(function(player2){
                                team2.addPlayer(player2, {status: 'active'});
                                team2.save().then(function(){
                                    var models = {
                                        league: league,
                                        commish: commish,
                                        team1: team1,
                                        team2: team2,
                                        player1: player1,
                                        player2: player2
                                    }
                                    done(models);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

var setUpSimpleTrade = function(done){
    setUpLeague(function(su) {
        db.Transaction.create({type: 'trade', LeagueId: su.league.id, authorId: su.team1.id}).then(function (transaction) {
            var items = [
                {
                    assetType: 'Player',
                    asset: su.player1.id,
                    sourceId: su.team1.id,
                    destinationId: su.team2.id,
                    TransactionId: transaction.id
                },
                {
                    assetType: 'Player',
                    asset: su.player2.id,
                    sourceId: su.team2.id,
                    destinationId: su.team1.id,
                    TransactionId: transaction.id
                }
            ];
            db.TransactionItem.bulkCreate(items).then(function () {
                su.transaction = transaction;
                done(su);
            });
        });
    });
}

describe('Transaction Helper', function() {
    beforeEach(function(done) {
        // Clear db before testing
        db.TransactionItem.destroy({},{truncate: true}).then(function() {
            db.TransactionApproval.destroy({},{truncate: true}).then(function() {
                db.Transaction.destroy({},{truncate: true}).then(function() {
                    db.Team.destroy({},{truncate: true}).then(function() {
                        db.Player.destroy({},{truncate: true}).then(function() {
                            db.LeagueSetting.destroy({},{truncate: true}).then(function() {
                                db.League.destroy({},{truncate: true}).then(function() {
                                     done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it('should create team transaction approvals', function(done) {
        setUpSimpleTrade(function (su) {
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
        setUpSimpleTrade(function (su) {
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
        setUpSimpleTrade(function (su) {
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