'use strict';

var _ = require('lodash');
var db = require('../models');
var League = db.League;
var Sport = db.Sport;
var Team = db.Team;
var Player = db.Player;
var logger = require('../../logger')
var BPromise = require("sequelize/node_modules/bluebird");

var teamArray = []

// Get list of leagues
exports.index = function(req, res) {
  League.findAll().then(function (leagues) {
      return res.json(200, leagues);
  }, function(error){
      return handleError(res, error);
  });
};

// Get a single league
exports.show = function(req, res) {
    League.find(req.params.id).then(function (league) {
        if(!league) { return res.send(404); }
        return res.json(league);
    }, function(error){
        return handleError(res, error);
    });
};

// Creates a new league in the DB.
exports.create = function(req, res) {
  League.create(req.body).then(function(league){
      return res.json(201, league);
  },function(error) {
      return handleError(res, error);
  });
};

// Updates an existing league in the DB.
exports.update = function(req, res) {
  if(req.body.id) { delete req.body.id; }
  League.find(req.params.id).then(function (league) {
      if(!league) { return res.send(404); }
      league.updateAttributes(req.body).then(function(league) {
          return res.json(league);
      }, function(error) {
          return handleError(res, error);
      });
  }, function(error){
      return handleError(res, error);
  });
};

// Deletes a league from the DB.
exports.destroy = function(req, res) {
  League.find(req.params.id).then(function (league) {
      if(!league) { return res.send(404); }
      league.destroy().then(function(league) {
          return res.send(204);
      }, function(error) {
          return handleError(res, error);
      });
  }, function(error){
      return handleError(res, error);
  });
};

// Get the teams owned by the current user in a single league
exports.teams = function(req, res) {
    var user = req.user;
    user.getTeams({where: {LeagueId: req.params.id}}).then(function (teams) {
        if(!teams) { return res.send(404); }
        return res.json(teams);
    }, function(error){
        return handleError(res, error);
    });
};

// Get your rivals' teams in a given league
exports.rival_teams = function(req, res) {
    var me = req.user;
    var teams = db.Team.findAll({
        where: {LeagueId: req.params.id, special: null},
        include: [ db.User ]
    }).then(function (teams) {
        if(!teams) { return res.send(404); }
        var filteredTeams = _.select(teams, function(team){
            // only select the teams whose user list doesn't include me
            var myTeam = _.select(team.users, function(user){
                    return user.id == me.id;
                }).length != 0;
            return !myTeam;
        });
        // Only include users' public profile and stake information.
        var teamsWithProfiles = _.map(filteredTeams, function(team){
            var profiles = _.map(team.Users, function(user){
                return {profile: user.profile, role: user.Stake.role};
            });
            var teamObject = team.values;
            teamObject.Users = profiles;
            return teamObject;
        });
        return res.json(teamsWithProfiles);
    }, function(error){
        return handleError(res, error);
    });
};

// Get the settings of a given league
// If a setting key is provided, get the setting just for that key
exports.settings = function(req, res) {
    var wheres = {LeagueId: req.params.id};
    if(req.params.key != null){
        wheres.key = req.params.key;
    }
    db.LeagueSetting.findAll({where: wheres}).then(function (settings) {
        if(!settings) { return res.send(404); }
        return res.json(settings);
    }, function(error){
        return handleError(res, error);
    });
};

// Populate a sport of a league with teams
exports.populate = function(req, res) {
  var selectedLeague = "";
  var user = req.user;

  if (user.role !== 'admin') {
    logger.log("error", "Populating league is restricted to admins only");
    return res.send (403);
  }
  League.find(req.params.id).then(function (league) {
    if (!league) {
      return res.send(404);
    }
    selectedLeague = league;
  }).then(function () {
    return Sport.find(req.params.sport_id);
  }).then(function(selectedSport) {
    return populateLeague(selectedLeague, selectedSport);
    }).then (function() {
      return res.send(204, league);
    }).catch (function(error) {
      return handleError(res, error);
    });
};

// Fill all teams in a sport of a league with players of the same sport
exports.fill = function(req, res) {
    var selectedSport = ""
    var selectedLeague = ""
    var selectedTeams = []
    var selectedPlayers = []

    var user = req.user;
    if (user.role !== 'admin') {
        logger.log("error", "Filling teams is restricted to admins only");
        return res.send (403);
    }
    League.find(req.params.id).then(function(league) {
      selectedLeague = league
    }).then(function() {
      return Sport.find(req.params.sport_id)
    }).then(function(sport) {
      selectedSport = sport
    }).then(function() {
      return Team.findAll({
        where: [{ special: null, SportId: selectedSport.id, LeagueId: selectedLeague.id }]
      });
    }).then(function(teams) {
      selectedTeams = teams
    }).then(function() {
      return Player.findAll({
        where: { SportId: selectedSport.id }
      })
    }).then(function(players) {
      selectedPlayers = players
    }).then(function() {
      return assignPlayers(selectedTeams, selectedPlayers);
    }).then(function() {
      return res.send(204);
    })
  .catch (function(error) {
      return handleError(res, error);
  });
};

function handleError(res, error) {
  return res.send(500, error);
}

/**
* Created by Sammy on 12/3/14
**/

function populateLeague(league, sport) {
  var commishTeam = {
    name: 'Commisioner Team',
    special: 'commish',
    LeagueId: league.id,
    SportId: sport.id
  };

  var freeAgencyTeam = {
    name: 'Free Agency Team',
    special: 'freeagency',
    LeagueId: league.id,
    SportId: sport.id
  };

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

  _(userTeams).forEach(function(teamName) {
    teamArray.push({
      name: teamName,
      LeagueId: league.id,
      SportId: sport.id
    });
  });
  teamArray.push(commishTeam, freeAgencyTeam);
  return createTeams(teamArray);
}

function createTeams(teamArray) {
  return db.Team
      .bulkCreate(teamArray)
    .success(function() {
      logger.log("info", "Suceeded in populating league");
    }).error(function(err) {
      return logger.log("error", "Failure to populate league")
    })
}

/**
* Created by Sammy on 1/13/15
**/

function assignPlayers(teams, players) {
    var realWorldTeams = []

    realWorldTeams = _.chain(players)
      .pluck('realWorldTeam')
      .uniq()
      .value();
    return BPromise.map(realWorldTeams, function(realTeam) {
        var realTeamIndex = realWorldTeams.indexOf(realTeam);
        return db.Player.findAll({
            where: { realWorldTeam: realTeam }
        }).then(function(realTeamPlayers) {
            return BPromise.map(realTeamPlayers, function(realTeamPlayer) {
                if (realTeamIndex >= teams.length) {
                    db.Team.find({
                    where: {special: "freeagency"}
                }).then(function(freeAgentTeam) {
                    freeAgentTeam.addPlayer(realTeamPlayer);
                    return freeAgentTeam.save();
                });
                } else {
                    teams[realTeamIndex].addPlayer(realTeamPlayer);
                    return teams[realTeamIndex].save();
                }
            });
        });
    });
  }
