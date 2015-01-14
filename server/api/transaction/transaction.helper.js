var _ = require('lodash');
var Promise = require("sequelize/node_modules/bluebird");
var db = require('../models');
var MessageHelper = require ('../message/message.helper.js');

var COUNTERED_MESSAGE = function(teamName){
    if(teamName != null){
        return 'Countered by ' + teamName;
    }
    return 'Countered'
}

// Creates a TransactionApproval based on the given attributes object.
// If status is 'pending', creates a system message to the approver team and sends it out as an e-mail
// Returns a promise that resolves with the created Approval.
exports.createApproval = function(approvalInfo){
    return Promise.bind({}).then(function (approval) {
        return db.TransactionApproval.create(approvalInfo)
    }).then(function (approval) {
        this.approval = approval;
        if(this.approval.status == 'pending'){
            messageDetail = {
                _parameters: JSON.stringify({
                    subject: 'You have a trade offer pending approval',
                    text: 'Log in to shadosports.com to see the offer details.'
                }),
                recipientId: this.approval.TeamId,
                type: 'notification'
            }
            return db.Message.create(messageDetail)
        }
        return Promise.resolve(null)
    }).then(function(message){
        if(message != null) {
            MessageHelper.messageEmail(message.id);
        }
        return this.approval;
    })
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
            return exports.createApproval(approvalInfo);
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

        return exports.createApproval(approvalInfo);
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

var WRONG_PLAYER_OWNERSHIP_MESSAGE = function(team){
    return team.name + ' does not have one of the proposed players on its roster.'
}
var INSUFFICIENT_BUDGET_MESSAGE = function(budgetTransfered, team){
    return budgetTransfered + ' is less than ' + team.name + '\'s available budget of ' + team.budget + '.'
}
var MISSING_TRANSACTION_ITEM_INFO_MESSAGES = {
    asset: 'One or more transaction items is missing an asset',
    assetType: 'One or more transaction items is missing an asset type',
    sourceId: 'One or more transaction items is missing a source team',
    destinationId: 'One or more transaction items is missing a destination team'
}

//Verifies that every asset in a list of proposed transaction items is owned by the correct source team
// Returns a promise that resolves with a list of failure reasons
exports.verifyAssetOwners = function(transactionItems){
    var sourceTeamIds = _.unique(_.map(transactionItems,'sourceId'))
    var teamsQuery = {
        where: {id: {in: sourceTeamIds}},
        include: [{
            model: db.Player,
            required: false
        }]
    }
    return db.Team.findAll(teamsQuery).then(function(teams){
        var errors = []
        _.each(transactionItems, function(item){
            // For each possible key in transactionItem, check if it's missing and if so add a specific message
            var malformedItem = false;
            _.each(_.keys(MISSING_TRANSACTION_ITEM_INFO_MESSAGES), function(key){
                if(item[key] == null){
                    errors.push(MISSING_TRANSACTION_ITEM_INFO_MESSAGES[key])
                    malformedItem = true;
                }
            })
            if(!malformedItem) {
                var sourceTeam = _.find(teams, {id: item.sourceId})
                switch (item.assetType) {
                    case 'Player':
                        var sourceHasPlayer = _.any(sourceTeam.Players, function (player) {
                            return player.id == item.asset;
                        })
                        if (!sourceHasPlayer) {
                            errors.push(WRONG_PLAYER_OWNERSHIP_MESSAGE(sourceTeam))
                        }
                        break;
                    case 'Budget':
                        if (sourceTeam.budget < item.asset) {
                            errors.push(INSUFFICIENT_BUDGET_MESSAGE(item.asset, sourceTeam));
                        }
                        break;
                }
            }
        })
        return _.uniq(errors);
    })
}


// Accept or reject a trade proposal
// If the transaction status is not pending, do not change the approval.
// Returns a promise
exports.acceptOrReject = function(transactionId, teamId, isApproved){
    var query = {
        where: {id: transactionId},
        include: [{
            model: db.TransactionApproval,
            required: false
        }]
    }
    return db.Transaction.find(query).then(function(transaction){
        if(!transaction){
            return Promise.reject("No transaction found with given ID " + transaction.id)
        }
        if(transaction.status != 'pending'){
            return Promise.reject("Transaction status is '" + transaction.status + "' so it is ineligible to approval.");
        }
        var approval = _.find(transaction.TransactionApprovals, function(a){return a.TeamId == teamId});
        if(approval == null){
            return Promise.reject("Team " + teamId + " does not have a say in the transaction.");
        }
        approval.status = isApproved ? 'approved' : 'rejected';
        return approval.save();
    })
}