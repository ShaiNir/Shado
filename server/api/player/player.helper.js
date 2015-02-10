/**
 * Created by shai on 2/6/15.
 */
var _ = require('lodash');
var BPromise = require("sequelize/node_modules/bluebird");
var db = require('../models');

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
    })
}