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
    {name: "Free Agency Team", id: 4}
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
    id: 8}
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
    var teams = db.Team.findAll();
    var dbPlayers = db.Player.findAll({group: ['realWorldTeam'] })
    var lodashPlayers = db.Player.findAll();

    console.log("LODASH PLAYERS");
    _.groupBy(lodashPlayers, function(lodashPlayer) { console.log(lodashPlayer); });
    console.log("DB PLAYERS");
    console.log(dbPlayers);

    // for every player with a different realWorldTeam, you assign them to a
    // different team.

  }

  return {
    fillTeams : _fillTeams
  }
}());

module.exports = Fill;