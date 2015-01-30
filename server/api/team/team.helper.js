var _ = require('lodash');
var db = require('../models');
var SettingHelper = require('../league_setting/league_setting.helper');
var BPromise = require("sequelize/node_modules/bluebird");

var VALIDATION_MESSAGES = {
    TOO_MANY_PLAYERS: "This team has more players on roster than the league roster maximum.",
    BUDGET: "This team does not have sufficient budget to afford its players' salaries",
    BUDGET_WITH_TAX: "This team does not have sufficient budget to afford its players' salaries and the tax for exceeding the soft cap",
    HARD_CAP: "This team's total salary is higher than the league hard salary cap."
}

var TEAM_VALIDATION_INCLUDES = [
    {model: db.League, include: [{model: db.LeagueSetting, required: false}]},
    {model: db.Player}
];

exports.messages = VALIDATION_MESSAGES;

// List of validations to be run.
// These functions take in the team and the team's total player salary
// (the latter so that we don't have to total up player salary over and over)
// Functions return an array of validation failure codes.
var ROSTER_VALIDATIONS = [
    // Make sure the team does not have too many players.
    function(team){
        var errors = [];
        var rosterCap = SettingHelper.getSetting(team.League, 'ROSTER_CAP');
        if(rosterCap && team.Players.length > rosterCap){
            errors.push(VALIDATION_MESSAGES.TOO_MANY_PLAYERS);
        }
        return errors;
    },
    // Make sure the team can afford all its players
    // Takes into account soft caps and taxes, if present
    function(team, totalSalary){
        var errors = [];
        if(team.budget && totalSalary > team.budget){
            errors.push(VALIDATION_MESSAGES.BUDGET);
        } else {
            var softCap = parseInt(SettingHelper.getSetting(team.League, 'SALARY_SOFT_CAP'));
            var tax = parseInt(SettingHelper.getSetting(team.League, 'SALARY_SOFT_CAP_TAX_PERCENT'))/100.0;
            if (softCap && totalSalary > softCap && (totalSalary + (totalSalary - softCap) * tax)) {
                errors.push(VALIDATION_MESSAGES.BUDGET_WITH_TAX);
            }
        }
        return errors;
    },
    // Make sure the team's total player salary is not greater than the league's hard cap
    function(team, totalSalary){
        var errors = [];
        var hardCap = parseInt(SettingHelper.getSetting(team.League, 'SALARY_HARD_CAP'));
        if(hardCap && totalSalary > hardCap){
            errors.push(VALIDATION_MESSAGES.HARD_CAP);
        }
        return errors;
    }
];

/**
 * Given a team, calculate whether the team can accommodate its roster given
 * its current budget and league salary limits.
 * Returns an empty array if valid or an array of reasons why the roster is invalid.
 */
var validateRoster = function(team){
    var totalSalary = _.reduce(team.Players, function(sum, player){
        if(player.PlayerAssignment.salary != null) {
            return sum + player.PlayerAssignment.salary
        }
    },0);
    return _.reduce(ROSTER_VALIDATIONS, function(errors,validation){
        var failures = validation(team, totalSalary);
        return errors.concat(failures);
    },[]);
};

/**
 * Given a team ID, calculate whether the team can accommodate its roster given
 * its current budget and league salary limits.
 * Returns a promise which returns an empty array if valid or an array of
 * reasons why the roster is invalid.
 */
exports.validateRosterForTeam = function(teamId){
    return db.Team.find({
        where: {id: teamId},
        include:  TEAM_VALIDATION_INCLUDES
    }).then(function(team){
        return validateRoster(team);
    });
};

// Check whether the given team's roster is above its league's theshold.
// Requires TEAM_VALIDATION_INCLUDES.
var rosterInvalid = function(team){
   return  _.intersection(_.values(VALIDATION_MESSAGES), validateRoster(team)).length > 0;
}

/**
 * Given a team Id, looks up the team and calculates whether its roster violates league limits.
 * If it does, virtually kicks players off the team until the roster fits within those limits.
 * Players are considered for removal in order of highest salary first.
 * This method does not make any changes itself; it just returns a list of players to be removed.
 * @param actualTeam The team to be reduced. Requires TEAM_VALIDATION_INCLUDES.
 */
exports.getAutoPurgedPlayers = function(actualTeam){
    // Convert team from sequelize model to plain old object so it can be manipulated without DB changes
    var team = JSON.parse(JSON.stringify(actualTeam));
    // Sort team's player by ascending salary
    team.Players = _.sortBy(team.Players, function(player){return player.PlayerAssignment.salary})
    var playersToPurge = [];
    while(team.Players.length > 0 && rosterInvalid(team)) {
        var highestSalaryPlayer = team.Players.pop();
        playersToPurge.push(highestSalaryPlayer.id);
    }
    return playersToPurge;
};


// Verifies that the given user is authorized to control the given team.
// Returns a promise that resolves with true if the user is authorized or false otherwise
exports.verifyStake = function(userId, teamId){
    var teamQuery = { where: {id: teamId}, include: [db.User]}
    return BPromise.bind({}).then(function() {
        return db.Team.findOne(teamQuery)
    }).then(function(team) {
        if(!team){ return BPromise.reject("No team found with given ID " + teamId)}
        return _.any(team.Users, function(user){
            return user.id == userId
        })
    })
}

