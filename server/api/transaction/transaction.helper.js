var _ = require('lodash');
var Promise = require("sequelize/node_modules/bluebird");
var db = require('../models');

var COUNTERED_MESSAGE = function(teamName){
    if(teamName != null){
        return 'Countered by ' + teamName;
    }
    return 'Countered'
}


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
// Returns a promise
exports.createTradeApprovals = function(transaction){
    if(transaction.type == 'trade'){
        return Promise.all([
            exports.createAssetOwnerApprovals(transaction.id),
            exports.createCommishApproval(transaction.id)
        ]);
    } else {
        return Promise.resolve([]);
    }
};

// Given a transaction series id, finds every pending transaction in its series
// and sets those transactions' statuses to rejected.
// authorId can specify a team name that countered the trade.
// If sqlChunk specifies a SQL transaction, the update occurs as part of that transaction
exports.counteroffer = function(transSeriesId, authorId, sqlChunk){
    return db.Team.find(authorId).then(function(team){
        var teamName = (team != null) ? team.name : null
        var statusMessage = COUNTERED_MESSAGE(teamName)

        var options = {
            where:{seriesId: transSeriesId, status: 'pending'}
        }
        if(sqlChunk != null){
            options.transaction = sqlChunk
        }
        var values = {status: 'rejected', statusMessage: statusMessage}
        return db.Transaction.update(values, options)
    });
}


// Creates a transaction with the given transaction details and items
// Returns a promise
exports.createTransaction = function(transactionDetail, items){
    return Promise.bind({}).then(function() {
        return db.sequelize.transaction();
    }).then(function(sqlChunk){
        // We're calling our SQL transaction 'sqlChunk' because it's completely different from the Shado concept of transaction
        this.sqlChunk = sqlChunk;
        if(transactionDetail.seriesId != null) {
            return exports.counteroffer(transactionDetail.seriesId, transactionDetail.authorId, this.sqlChunk);
        }
        return Promise.resolve();
    }).then(function() {
        return db.Transaction.create(transactionDetail, {transaction: this.sqlChunk});
    }).then(function(transaction) {
        this.transaction = transaction;
        return Promise.map(items, function (itemDetail) {
            return db.TransactionItem.create(itemDetail).then(function (item) {
                return item;
            });
        });
    }).then(function (transactionItems) {
        this.transaction.setTransactionItems(transactionItems);
        // If there's no transaction series specified, start a new series
        if(this.transaction.seriesId == null){
            this.transaction.seriesId = this.transaction.id;
        }
        return this.transaction.save({transaction: this.sqlChunk});
    }).then(function(transaction){
        this.transaction = transaction;
        return this.sqlChunk.commit();
    }).then(function(){
        return this.transaction;
    });
}