'use strict';

var _ = require('lodash');
var db =  require('../models');
var Transaction = db.Transaction;

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

// Creates a new transaction in the DB.
// Input
/** Format:
{
    league: ###,
    type: 'TYPE',
    TransactionItems: [
      {
         type:
      }
    ]
}
*/
// UNDER CONSTRUCTION
exports.create = function(req, res) {
    var transactionDetail = _.pick(req.body,['LeagueId','type']);
    var items = req.body.TransactionItems || {};
    var transactionId;
    Transaction.create(transactionDetail).then(function(transaction){
        _.each(items, function(itemDetail){
            db.TransactionItem.create(itemDetail).then(function(item){
                transaction.addTransactionItem(item).then(function(){},function(err){
                    return handleError(res, err);
                });
            },function(error){
                return handleError(res, err);
            });
        });
        // Include transaction items and approval needed
        Transaction.find({where: {id: transaction.id}, include: [db.TransactionItem, db.TransactionApproval]})
            .then(function(returnTransaction){
                return res.json(201, returnTransaction);
            }, function(error){
                return handleError(res, error);
            });
    },function(error) {
        return handleError(res, error);
    });
};

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
    console.trace();
    return res.send(500, error);
}
