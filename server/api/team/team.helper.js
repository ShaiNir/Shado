var _ = require('lodash');
var db = require('../models');
var SettingHelper = require('../league_setting/league_setting.helper');

var VALIDATION_MESSAGES = {
    TOO_MANY_PLAYERS: "This team has more players on roster than the league roster maximum.",
    BUDGET: "This team does not have sufficient budget to afford its players' salaries",
    BUDGET_WITH_TAX: "This team does not have sufficient budget to afford its players' salaries and the tax for exceeding the soft cap",
    HARD_CAP: "This team's total salary is higher than the league hard salary cap."
}

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
 * Given a team ID, calculate whether the team can accommodate its roster given
 * its current budget and league salary limits. Returns a promise which returns
 * an empty array if valid or an array of reasons why the roster is invalid.
 */
exports.validateRoster = function(teamId, amount){
    return db.Team.find({
        where: {id: teamId},
        include:  [
                {model: db.League, include: [{model: db.LeagueSetting, required: false}]},
                {model: db.Player}
        ]
    }).then(function(team){
        var totalSalary = _.reduce(team.Players, function(sum, player){
            if(player.PlayerAssignment.salary != null) {
                return sum + player.PlayerAssignment.salary
            }
        },0);
        return _.reduce(ROSTER_VALIDATIONS, function(errors,validation){
            var failures = validation(team, totalSalary);
            return errors.concat(failures);
        },[]);
    });
}