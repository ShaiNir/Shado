/**
* Created by Sammy on 1/13/15
**/

var db = require('../api/models');
var _ = require('lodash');

var Fill = (function() {
  var stockTeams = [
    {name: "Albany Alphas"},
    {name: "Alaska Arctics"},
    {name: "Baltimore Spirits"},
    {name: "Free Agency Team"}
  ]

  var stockPlayers = [
    {name: "Rodger Umaechi",
    realWorldTeam: "ALB"},
    {name: "Apiatan Redmane",
    realWorldTeam: "ALB"},
    {name: "Carl Esteban",
    realWorldTeam: "ALK"},
    {name: "Ambrose Slade",
    realWorldTeam: "ALK"},
    {name: "Silvia Windcreek",
    realWorldTeam: "BAL"},
    {name: "Dirk von Stryker",
    realWorldTeam: "BAL"},
    {name: "Scoonie Barrett",
    realWorldTeam: "HWI"},
    {name: "Alphonse Norwich IV",
    realWorldTeam: "HWI"}
  ]

  var _fillTeams = function(user) {
    if (user.role !== 'admin') {
      console.log("Error, user is not an admin, user role is: " + user.role);
      Promise.reject("User is not an admin");
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
    var players = db.Player.findAll({group: 'realWorldTeam'});

    // return _.groupBy(players, 'realWorldTeam').then(function (groupPlayers) {
    //   console.log(groupPlayers);
    // })
  }

  return {
    fillTeams : _fillTeams
  }
}());

module.exports = Fill;
