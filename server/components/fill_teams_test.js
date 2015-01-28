/**
* Created by Sammy on 1/13/15
**/

var db = require('../api/models');
var _ = require('lodash');

var Fill = (function() {
  var stockTeams = [
    {name: "Albany Alphas", id: 1},
    {name: "Alaska Arctics", id: 2},
    {name: "Baltimore Spirits", id: 3},
    {name: "Free Agency Team", id: 4, special: 'freeagency'},
    {name: "Commissioner Team", id: 5, special: 'commish'}
  ]

  var stockPlayers = [
    {name: "Rodger Umaechi",
    realWorldTeam: "ALB",
    id: 1},
    {name: "Apiatan Redmane",
    realWorldTeam: "ALB",
    id: 2},
    {name: "Carl Esteban",
    realWorldTeam: "ALK",
    id: 3},
    {name: "Ambrose Slade",
    realWorldTeam: "ALK",
    id: 4},
    {name: "Silvia Windcreek",
    realWorldTeam: "BAL",
    id: 5},
    {name: "Dirk von Stryker",
    realWorldTeam: "BAL",
    id: 6},
    {name: "Scoonie Barrett",
    realWorldTeam: "HWI",
    id: 7},
    {name: "Alphonse Norwich IV",
    realWorldTeam: "HWI",
    id: 8},
    {name: "Neil LaRocca",
    realWorldTeam: "PLY",
    id: 9},
    {name: "Nina Lima",
    realWorldTeam: "PLY",
    id: 10}
  ]

  var _fillTeams = function(user) {
    if (user.role !== 'admin') {
      console.log("Error, user is not an admin, user role is: " + user.role);
      return Promise.reject("User is not an admin");
    }
    return createTeams().then(function () {
      return assignPlayers();
    });
  }

  var createTeams = function() {
    return db.Team.bulkCreate(stockTeams).then(function() {
      return db.Player.bulkCreate(stockPlayers)
    });
  }

  var assignPlayers = function() {
    var realWorldTeams = []

    db.Team.findAll({
      where: [{special: null}]
    }).then(function(teams) {
      db.Player.findAll().then(function(players) {
        realWorldTeams = _.chain(players)
          .pluck('realWorldTeam')
          .uniq()
          .value();
        _(realWorldTeams).map(function(realTeam) {
          var realTeamIndex = realWorldTeams.indexOf(realTeam);
          db.Player.findAll({
           where: { realWorldTeam: realTeam }
          }).then(function(realTeamPlayers) {
            _(realTeamPlayers).map(function(realTeamPlayer) {
              if (realTeamIndex >= teams.length) {
                db.Team.find({
                  where: {special: "freeagency"}
                }).then(function(freeAgentTeam) {
                  freeAgentTeam.addPlayer(realTeamPlayer);
                  freeAgentTeam.save();
                });
              } else {
                teams[realTeamIndex].addPlayer(realTeamPlayer);
                teams[realTeamIndex].save();
              }
            });
          });
        });
      });
    });
  }

  return {
    fillTeams : _fillTeams
  }
}());

module.exports = Fill;
