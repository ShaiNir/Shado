'use strict';

var should = require('should');
var db =  require('../models');
var TransactionHelper = require('../transaction/transaction.helper');
var Promise = require("sequelize/node_modules/bluebird");
var _ = require('lodash');

db.sequelize.sync();

describe('Transaction Model', function() {
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

    it('should create team transaction approvals', function(done){
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
                                        db.Transaction.create({type: 'trade', LeagueId: league.id}).then(function(transaction){
                                            var items = [
                                                {
                                                    assetType: 'Player',
                                                    asset: player1.id,
                                                    sourceId: team1.id,
                                                    destinationId: team2.id,
                                                    TransactionId: transaction.id
                                                },
                                                {
                                                    assetType: 'Player',
                                                    asset: player2.id,
                                                    sourceId: team2.id,
                                                    destinationId: team1.id,
                                                    TransactionId: transaction.id
                                                }
                                            ];
                                            Promise.map(items, function(itemDetail){
                                                return db.TransactionItem.create(itemDetail).then(function(item){
                                                    return item;
                                                });
                                            }).then(function(){
                                                TransactionHelper.createAssetOwnerApprovals(transaction.id, team1.id).then(function(approvals){
                                                    approvals.should.be.instanceOf(Array);
                                                    approvals.length.should.equal(2)
                                                    var teamIds = [team1.id, team2.id];
                                                    var approvalTeamIds = [approvals[0].TeamId, approvals[1].TeamId];
                                                    _.min(approvalTeamIds).should.equal(_.min(teamIds));
                                                    _.max(approvalTeamIds).should.equal(_.max(teamIds));
                                                    if(approvals[0].TeamId == team1.id){
                                                        approvals[0].status.should.equal('approved');
                                                        approvals[1].status.should.equal('pending');
                                                    } else {
                                                        approvals[0].status.should.equal('pending');
                                                        approvals[1].status.should.equal('approved');
                                                    }

                                                    var commishSetting = {LeagueId: league.id, key: 'TRADE_COMMISH_AUTO_APPROVE', value: 'true'};
                                                    db.LeagueSetting.create(commishSetting).then(function(){
                                                        TransactionHelper.createCommishApproval(transaction.id).then(function(approval){
                                                            console.log("SDEB A " + JSON.stringify(approval));
                                                            approval.should.be.instanceOf(Object);
                                                            approval.TeamId.should.equal(commish.id);
                                                            approval.status.should.equal('approved');
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
    });
})