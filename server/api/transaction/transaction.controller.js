'use strict';

var _ = require('lodash');
var db = require('../models');
var BPromise = require("sequelize/node_modules/bluebird");
var Transaction = db.Transaction;
var TransactionHelper = require('../transaction/transaction.helper');
var TeamHelper = require('../team/team.helper');

// Get list of transactions
exports.index = function(req, res) {
    Transaction.findAll().then(function (transactions) {
        return res.json(200, transactions);
    }, function(error){
        return handleError(res, error);
    });
};

// Get a single transaction
exports.show = function(req, res) {
    Transaction.find(req.params.id).then(function (transaction) {
        if(!transaction) { return res.send(404); }
        return res.json(transaction);
    }, function(error){
        return handleError(res, error);
    });
};

/**
 * Creates a new trade in the DB.
 * Creates the transaction with type 'trade' and status 'pending'
 * Then creates trade approvals for trade participants and commish
 * Input Format:
 {
     LeagueId: ###,
     type: 'TYPE',
     authorId: ID_OF_AUTHOR_TEAM,
     TransactionItems: [
       {
         assetType: 'TYPE',
         asset: ASSET_ID, // The ID of the asset in its respective table
         sourceId: ###,
         destinationId: ###
       }
     ]
 }
 */
exports.trade = function(req, res) {
    var transactionDetail = _.pick(req.body,['LeagueId', 'seriesId','authorId']);
    transactionDetail.status = 'pending';
    transactionDetail.type = 'trade';
    var items = req.body.TransactionItems || {};
    BPromise.bind({}).then(function() {
        return TransactionHelper.verifyAssetOwners(req.body.TransactionItems);
    }).then(function(errors) {
        if(errors.length > 0){
            return BPromise.reject(errors);
        }
        return TransactionHelper.createTransaction(transactionDetail, items)
    }).then(function(transaction) {
        this.transaction = transaction
        return TransactionHelper.createTradeApprovals(this.transaction);
    }).then(function(approvals){
        return Transaction.find({where: {id: this.transaction.id}, include: [db.TransactionItem, db.TransactionApproval]})
            .then(function (returnTransaction) {
                res.json(201, returnTransaction);
            });
    }).catch(function(error) {
        return handleError(res, error);
    });
};

// Approve or reject a trade.
// Request body:
// {TeamId: [ID of team approving or rejecting], isApproved: [whether trade is approved or rejected]}
exports.approve = function(req,res){
    TeamHelper.verifyStake(req.user.id, req.body.TeamId).then(function(authorized){
        if(authorized){
            TransactionHelper.acceptOrReject(req.params.id,req.body.TeamId,req.body.isApproved).then(function(){
                return res.json(200)
            })
        } else {
            res.send(403);
        }
    }).catch(function(error) {
        handleError(res, error);
    });

}

// Updates an existing transaction in the DB.
exports.update = function(req, res) {
    if(req.body.id) { delete req.body.id; }
    Transaction.find(req.params.id).then(function (transaction) {
        if(!transaction) { return res.send(404); }
        transaction.updateAttributes(req.body).then(function(transaction) {
            return res.json(transaction);
        }, function(error) {
            return handleError(res, error);
        });
    }, function(error){
        return handleError(res, error);
    });
};

// Deletes a transaction from the DB.
exports.destroy = function(req, res) {
    Transaction.find(req.params.id).then(function (transaction) {
        if(!transaction) { return res.send(404); }
        transaction.destroy().then(function(transaction) {
            return res.send(204);
        }, function(error) {
            return handleError(res, error);
        });
    }, function(error){
        return handleError(res, error);
    });
};

function handleError(res, error) {
    return res.send(500, error);
}
