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
            console.log("error", "User is not an admin");
        }
        db.League.create({
        name: 'Test League',
        id: 1
        }).success(function(league){
            for(var teamNumber = 1; teamNumber < 21; teamNumber ++) {
                buildTeams(teamNumber, league)
            }
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
        });
    }

    var buildTeams = function(teamNumber, league) {
        db.Team.create({
            name: 'Team ' + teamNumber
        }).success(function(team) {
            team.setLeague(league);
            team.save();
        });
    }
    return {
        fillLeague : _fillLeague
    }
}());

module.exports = Populate;
