/**
 * Created by shai on 2/6/15.
 */
var _ = require('lodash');
var BPromise = require("sequelize/node_modules/bluebird");
var db = require('../models');

TRANSACTION_CANCELLED_OWNERSHIP_MESSAGE = function(teamName, playerName){
    if(teamName != null && playerName != null){
        return 'Cancelled because ' + teamName + ' does not own ' + playerName
    }
    return 'Cancelled because a team does not own one of the players it is attempting to trade away'
}

exports.rejectTransactionsWhereSourceTeamDoesNotOwnPlayer = function(playerId, leagueId){
    return BPromise.bind({}).then(function () {
        var teamQuery = {
            where: {LeagueId: leagueId},
            include: [{
                model: db.Player,
                where: {id: playerId},
                required: true
            }]
        }
        return db.Team.findAll(teamQuery)
    }).then(function(teams){
        if(teams.size == 0){
            return BPromise.reject('Player ' + playerId + ' is not owned by any team in league ' + leagueId)
        }
        this.team = teams[0];

        var transactionQuery = {
            where: {status: 'pending'},
            include: [{
                model: db.TransactionItem,
                where: {assetType: 'Player', sourceId: {ne: this.team.id}},
                required: true,
                include: [{
                    model: db.Team,
                    as: 'source'
                }]
            }]
        }
        return db.Transaction.findAll(transactionQuery)
    }).map(function(transaction){
        var sourceTeamName = transaction.TransactionItems[0].source.name;
        var playerName = this.team.Players[0].name;
        transaction.status = 'rejected';
        transaction.statusMessage = TRANSACTION_CANCELLED_OWNERSHIP_MESSAGE(sourceTeamName, playerName);
        return transaction.save();
    })

}

//Changes a player's assignment in a given league to the destination team
// TODO verify that source team matches the team that owns the player
// TODO alert if there are multiple player assignments for that player in that league
exports.changePlayerAssignment = function(playerId, destinationTeamId, leagueId) {
    return BPromise.bind({}).then(function () {
        var query = 'UPDATE "PlayerAssignments" \
        SET "TeamId" = ? , "status" = \'inactive\'\
        FROM "Teams" \
        WHERE "Teams"."id" = "PlayerAssignments"."TeamId" \
          AND "Teams"."LeagueId" = ? \
          AND "PlayerAssignments"."PlayerId" = ?'
        return db.sequelize.query(query, null, {}, [destinationTeamId, leagueId, playerId]);
    }).then(function(){
        return exports.rejectTransactionsWhereSourceTeamDoesNotOwnPlayer(playerId, leagueId)
    })
}