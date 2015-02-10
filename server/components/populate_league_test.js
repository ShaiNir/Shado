/**
* Created by Sammy on 12/8/14
**/
var db = require('../api/models');
var _ = require('lodash');
var BPromise = require("sequelize/node_modules/bluebird");

var Populate = (function() {
    var teamArray =[]

    var _fillLeague = function(user) {
        if (user.role !== 'admin') {
            console.log("Error, user is not an admin, user role is: " + user.role);
            return BPromise.reject("User is not an admin");
        }
        return db.League.create({
            name: 'Test League',
            id: 1
        }).success(function(league){
            pushTeams(league);
        }).success(function(){
            db.Team.bulkCreate(teamArray)
        });
    }

    var pushTeams = function(league) {

          var userTeams = [
            "Springfield Isotopes",
            "Havana Capitals",
            "Cheyenne Jacksonholes",
            "Las Vegas Leprechauns",
            "Flint Tropics",
            "Louisville Sluggers",
            "Yeehaw Junction Asi-Yaholas",
            "Ashville Robots",
            "Boulder Buttresses",
            "Biloxi Boomerangs",
            "Worcester Rockets",
            "Eire Egotists",
            "Calgary Cannons",
            "Hicksville Hobos",
            "Austin Normals",
            "Dallas Diamond Dogs",
            "Caguas Cauda Equinas",
            "Mexico Charros",
            "Portland Trailfollowers",
            "Walla Walla Krustys"
          ]

        var commishTeam = {
            name: 'Commish Team',
            special: 'commish',
            LeagueId: league.id,
        };

        var freeAgencyTeam = {
            name: 'Free Agency Team',
            special: 'freeagency',
            LeagueId: league.id,
        };

        _(userTeams).forEach(function(teamName) {
            teamArray.push({
              name: teamName,
              LeagueId: league.id
            });
          });
        teamArray.push(commishTeam, freeAgencyTeam);
    }
    return {
        fillLeague : _fillLeague
    }
}());

module.exports = Populate;
