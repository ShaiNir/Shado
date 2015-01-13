/**
* Created by Sammy on 1/13/15
**/

var db = require('../api/models');

var Fill = (function() {
  var stockTeams = [
    {name: "Albany Alphas"},
    {name: "Alaska Arctics"},
    {name: "Baltimore Spirits"}
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
    realWorldTeam: "BAL"}
  ]

  var _fillTeams = function(user) {
    if (user.role !== 'admin') {
      console.log("Error, user is not an admin, user role is: " + user.role);
      return false;
    }
    return db.Team.bulkCreate(stockTeams).then(function() {
      return db.Player.bulkCreate(stockPlayers)})
  }
  return {
    fillTeams : _fillTeams
  }
}());

module.exports = Fill;
