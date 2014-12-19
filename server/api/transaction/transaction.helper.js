var _ = require('lodash');
var Promise = require("sequelize/node_modules/bluebird");
var db = require('../models');

// Creates initial TransactionApproval items for every team involved in the transaction.
// If there is an author specified that last edited the transaction, that author's approval is automatically accepted.
// Returns a promise which resolves with the list of approvals
exports.createAssetOwnerApprovals = function(transactionId){
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
                TransactionId: transaction.id
            };
            // If an author team is specified, automatically approve the transaction for that team
            if (transaction.authorId == teamId) {
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

// Returns a promise which resolves with the list of approvals
exports.createCommishApproval = function(transactionId){
    return db.Transaction.find({
        where: {id: transactionId},
        include: [{model: db.League, include:
            [
                {model: db.LeagueSetting, where:{key: 'TRADE_COMMISH_AUTO_APPROVE'}, required: false},
                {model: db.Team, where:{special: 'commish'}, required: false}
            ]
        }]
    }).then(function(transaction){
        var approvalInfo = {
            role: 'commish',
            status: 'pending',
            TransactionId: transaction.id
        };

        var commishTeam = transaction.League.Teams[0];
        if(commishTeam){
            approvalInfo.TeamId = commishTeam.id;
        } else {
            return Promise.reject(new Error('League with ID ' + transaction.LeagueId + ' has no commissioner team!'));
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


//Check whether a transaction is a trade and if so creates the necessary Approval objects
exports.createTradeApprovals = function(transaction){
    if(transaction.type == 'trade'){
        return Promise.all([
            exports.createAssetOwnerApprovals(transaction.id),
            exports.createCommishApproval(transaction.id)
        ]);
    } else {
        return Promise.resolve([]);
    }
}