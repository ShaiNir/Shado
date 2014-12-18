/**
* Created by Sammy on 12/8/14
**/
var db = require('../api/models');

var Populate = (function() {
    var teamArray =[]
    var DEFAULT_USER_TEAM_TOTAL = 21


    var _fillLeague = function(user) {
        if (user.role !== 'admin') {
            console.log("Error, user is not an admin, user role is: " + user.role);
            return false;
        }
        db.League.create({
            name: 'Test League',
            id: 1
        }).success(function(league){
            pushSpecialTeams(league);
            for(var teamNumber = 1; teamNumber < DEFAULT_USER_TEAM_TOTAL; teamNumber ++) {
                pushUserTeams(teamNumber, league)
            }
        }).success(function(){
            db.Team
                .bulkCreate(teamArray)
                .success(function() {
                    console.log("Success!")
                }).error(function(err){
                    console.log("Failure!")
                });
        });
    }

    var pushUserTeams = function(teamNumber, league) {
        var newTeam = {
            name: 'Team ' + teamNumber,
            leagueId: league.id
        }
        teamArray.push(newTeam);
    }

    var pushSpecialTeams = function(league) {
        var commishTeam = {
            name: 'Commish Team',
            special: 'commish',
            leagueId: league.id,
        };

        var freeAgencyTeam = {
            name: 'Free Agency Team',
            special: 'freeagency',
            leagueId: league.id,
        };
        teamArray.push(commishTeam, freeAgencyTeam);
    }

    return {
        fillLeague : _fillLeague
    }
}());

module.exports = Populate;
