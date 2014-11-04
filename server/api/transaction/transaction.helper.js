var _ = require('lodash');
var Promise = require("sequelize/node_modules/bluebird");
var db = require('../models');

// Creates initial TransactionApproval items for every team involved in the transaction.
// If there is a user specified that last edited the transaction, that user's approval is automatically accepted.
// Returns a promise
exports.createAssetOwnerApprovals = function(transactionId, originTeamId){
    return db.Transaction.find({
        where: {id: transactionId},
        include: [{model: db.TransactionItem, include: [{model: db.Team, as: 'source'},{model: db.Team, as: 'destination'}]}]
    }).then(function(transaction) {
        var teamsByItem = _.map(transaction.TransactionItems, function(item){
            var teams = [];
            if(item.source && item.source.special == null){
                teams[teams.length] = item.source.id;
            }
            if(item.source && item.destination.special == null){
                teams[teams.length] = item.destination.id;
            }
            return teams;
        });
        var teamIds = _.unique(_.flatten(teamsByItem));
        return Promise.map(teamIds, function (teamId) {
            var approvalInfo = {
                TeamId: teamId,
                role: 'participant',
                status: 'pending',
                TransactionId: this.id
            };
            // If an origin team is specified, automatically approve the transaction for that team
            if (originTeamId == teamId) {
                approvalInfo.status = 'approved';
            }
            return db.TransactionApproval.create(approvalInfo).then(function (approval) {
                return approval;
            });
        }).then(function(approvals){
            return approvals;
        });

    });
};

exports.createCommishApproval = function(transactionId){
    return db.Transaction.find({
        where: {id: transactionId},
        include: [{model: db.League, include:
            [
                {model: db.LeagueSetting, where:{key: 'TRADE_COMMISH_AUTO_APPROVE'}, required: false},
                {model: db.Team, where:{special: 'commish'}}
            ]
        }]
    }).then(function(transaction){
        var approvalInfo = {
            role: 'commish',
            status: 'pending',
            TransactionId: this.id
        };

        var commishTeam = transaction.League.Teams[0];
        if(commishTeam){
            approvalInfo.TeamId = commishTeam.id;
        } else {
            throw new Error('League with ID ' + transaction.LeagueId + ' has no commissioner team!');
        }

        var trade_auto_approve = transaction.League.LeagueSettings[0];
        if(trade_auto_approve && trade_auto_approve.value == 'true'){
            approvalInfo.status = 'approved';
        }

        return db.TransactionApproval.create(approvalInfo).then(function (approval) {
            return approval;
        });
    });
}