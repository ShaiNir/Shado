/**
* Created by Sammy on 12/8/14
**/
var db = require('../api/models');
// var User = db.User;
// var League = db.League;
// var Team = db.Team;


var Populate = (function() {

    var commishTeam = {
            name: 'Commish Team',
            special: 'commish'
        };

    var freeAgencyTeam = {
        name: 'Free Agency Team',
        special: 'freeagency'
    };

    var _fillLeague = function(user) {
        if (user.role !== 'admin') {
            console.log("Error, user is not an admin, user role is: " + user.role);
            return false;
        }
        db.League.create({
            name: 'Test League',
            id: 1
        }).success(function(league){
            buildSpecialTeams(league);
            for(var teamNumber = 1; teamNumber < 21; teamNumber ++) {
                buildUserTeams(teamNumber, league)
            }
        });
    }

    var buildUserTeams = function(teamNumber, league) {
        db.Team.create({
            name: 'Team ' + teamNumber
        }).success(function(team) {
            team.setLeague(league);
            team.save();
        });
    }

    var buildSpecialTeams = function(league) {
        db.Team
            .create(commishTeam)
            .success(function(team) {
                team.setLeague(league);
                team.save();
            });
        db.Team
            .create(freeAgencyTeam)
            .success(function(team) {
                team.setLeague(league);
                team.save();
            });
    }
    return {
        fillLeague : _fillLeague
    }
}());

module.exports = Populate;
