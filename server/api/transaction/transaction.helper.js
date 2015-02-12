var _ = require('lodash');
var BPromise = require("sequelize/node_modules/bluebird");
var db = require('../models');
var MessageHelper = require ('../message/message.helper.js');
var PlayerHelper = require ('../player/player.helper.js');

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
    return BPromise.bind({}).then(function (approval) {
        return db.TransactionApproval.create(approvalInfo)
    }).then(function (approval) {
        this.approval = approval;
        if(this.approval.status == 'pending'){
            var messageDetail = {
                _parameters: JSON.stringify({
                    subject: 'You have a trade offer pending approval',
                    text: 'Log in to shadosports.com to see the offer details.'
                }),
                recipientId: this.approval.TeamId,
                type: 'notification'
            }
            return db.Message.create(messageDetail)
        }
        return BPromise.resolve(null)
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
        return BPromise.map(teamIds, function (teamId) {
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
            return BPromise.reject(new Error('League with ID ' + transaction.LeagueId + ' has no commissioner team!'));
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
        return BPromise.all([
            exports.createAssetOwnerApprovals(transaction.id),
            exports.createCommishApproval(transaction.id)
        ]);
    } else {
        return BPromise.resolve([]);
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
    return BPromise.bind({}).then(function() {
        return db.sequelize.transaction();
    }).then(function(sqlChunk){
        // We're calling our SQL transaction 'sqlChunk' because it's completely different from the Shado concept of transaction
        this.sqlChunk = sqlChunk;
        if(transactionDetail.seriesId != null) {
            return exports.counteroffer(transactionDetail.seriesId, transactionDetail.authorId, this.sqlChunk);
        }
        return BPromise.resolve();
    }).then(function() {
        return db.Transaction.create(transactionDetail, {transaction: this.sqlChunk});
    }).then(function(transaction) {
        this.transaction = transaction;
        return BPromise.map(items, function (itemDetail) {
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
            return BPromise.reject("No transaction found with given ID " + transaction.id)
        }
        if(transaction.status != 'pending'){
            return BPromise.reject("Transaction status is '" + transaction.status + "' so it is ineligible to approval.");
        }
        var approval = _.find(transaction.TransactionApprovals, function(a){return a.TeamId == teamId});
        if(approval == null){
            return BPromise.reject("Team " + teamId + " does not have a say in the transaction.");
        }
        approval.status = isApproved ? 'approved' : 'rejected';
        return approval.save();
    })
}


var CANCELLED_BUDGET_MESSAGE = function(teamName){
    if(teamName != null){
        return 'Cancelled because ' + teamName + ' has insufficient budget'
    }
    return 'Cancelled because a team has insufficient budget'
}

// Given a team ID, looks up every budget transaction that team is involved in
// and rejects it if the team is offering more budget than it currently has.
exports.rejectTransactionsOverBudgetForTeam = function(teamId){
    return BPromise.bind({}).then(function(){
        return db.Team.find(teamId);
    }).then(function(sourceTeam){
        this.sourceTeam = sourceTeam;
        var query = {
            where: {status: 'pending'},
            include: [{
                model: db.TransactionItem,
                where: {sourceId: teamId, assetType: 'Budget'},
                required: true
            }]
        }
        return db.Transaction.findAll(query)
    }).map(function(transaction){
        var sourceTeam =  this.sourceTeam
        var tradeBudget = _.reduce(transaction.TransactionItems, function(sum, item){
            if(item.assetType == 'Budget' && item.sourceId == sourceTeam.id){
                return sum + parseInt(item.asset);
            }
            return sum;
        },0)
        if(tradeBudget > sourceTeam.budget){
            transaction.status = 'rejected';
            transaction.statusMessage = CANCELLED_BUDGET_MESSAGE(this.sourceTeam.name);
            return transaction.save();
        }
    });
}


// Transfers a given budget amount from source team to destination team
// Returns a promise
exports.transferBudget = function(amount, sourceId, destinationId){
    return BPromise.bind({}).then(function(){
        return db.Team.find(sourceId);
    }).then(function(sourceTeam){
        this.sourceTeam = sourceTeam;
        return db.Team.find(destinationId);
    }).then(function(destinationTeam){
        this.destinationTeam = destinationTeam;
    }).then(function(){
        if(this.sourceTeam.budget - amount < 0){
            return BPromise.reject("Budget transfer failed because source team " + sourceId + " does not have " + amount + " available (it only has " + this.sourceTeam.budget + ".")
        }
        return db.sequelize.transaction()
    }).then(function(sqlChunk){
        this.sqlChunk = sqlChunk;
        this.sourceTeam.budget = this.sourceTeam.budget - amount;
        return this.sourceTeam.save({transaction: this.sqlChunk})
    }).then(function(){
        this.destinationTeam.budget = this.destinationTeam.budget + amount;
        return this.destinationTeam.save({transaction: this.sqlChunk})
    }).then(function(){
        return this.sqlChunk.commit();
    }).catch(function(error){
        this.sqlChunk.rollback();
        return BPromise.reject(error);
    }).then(function() {
        return exports.rejectTransactionsOverBudgetForTeam(sourceId)
    })
}

// Given a TransactionItem, switches the ownership of the asset to the destination team
// TODO If the assets are part of any existing trade proposals, cancel those proposals
// Returns a Promise
exports.resolveTransactionItem = function(item, leagueId){
    switch (item.assetType) {
        case 'Player':
            return PlayerHelper.changePlayerAssignment(item.asset, item.destinationId, leagueId)
            break;
        case 'Budget':
            return exports.transferBudget(parseInt(item.asset), item.sourceId, item.destinationId)
            break;
        default:
            return BPromise.reject(item.assetType + " is an invalid asset type for transaction item " + item.id)
    }
}

//Resolves a transaction:
//Verifies asset ownership
//Assigns assets to their new team (while atomically removing previous ownership)
//Checks every transaction involving these assets and suspends any that are no longer valid
// TODO consider making entire process a single SQL transaction
//Returns a Promise
exports.transact = function(transactionId){
    return BPromise.bind({}).then(function() {
        var query = {
            where: {id: transactionId},
            include: [{
                model: db.TransactionItem,
                required: false
            }]
        }
        return db.Transaction.find(query)
    }).then(function(transaction) {
        this.transaction = transaction;
        if(transaction.status == 'rejected'){
            return BPromise.reject('Transaction ' + this.transaction.id + ' status is rejected so it cannot be completed.')
        }
    }).then(function(){
        return exports.verifyAssetOwners(this.transaction.TransactionItems)
    }).then(function(failures) {
        if (failures.length > 0) {
            return BPromise.reject(failures)
        }
    }).then(function(item){
        this.transaction.status = 'completed';
        return this.transaction.save();
    }).then(function(){
        return this.transaction.TransactionItems;
    }).map(function(item){
        return exports.resolveTransactionItem(item, this.transaction.LeagueId)
    })
}