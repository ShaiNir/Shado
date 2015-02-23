'use strict';

var _ = require('lodash');
var db = require('../models');
var League = db.League;
var Sport = db.Sport;
var Team = db.Team;
var Player = db.Player;
var logger = require('../../logger')
var BPromise = require("sequelize/node_modules/bluebird");
var BetaHelper = require('../league/beta.helper');

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


// Creates a new toy test league in the DB.
exports.toy = function(req, res) {
    BetaHelper.leaguePlease().then(function(league){
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
  var user = req.user;
  if (user.role !== 'admin') {
    logger.log("error", "Populating league is restricted to admins only");
    return res.send (403);
  }
  var leagueId = req.params.id;
  var sportId = req.params.sport_id;
  BetaHelper.populateLeagueWithTeams(leagueId, sportId).then (function() {
    return res.send(204, league);
  }).catch (function(error) {
    return handleError(res, error);
  });
};

// Fill all teams in a sport of a league with players of the same sport
exports.fill = function(req, res) {
  var user = req.user;
  if (user.role !== 'admin') {
    logger.log("error", "Filling teams is restricted to admins only");
    return res.send (403);
  }
  var leagueId = req.params.id;
  var sportId = req.params.sport_id;
  BetaHelper.fillTeamsWithPlayersForSport(leagueId, sportId).then(function() {
    return res.send(204);
  }).catch (function(error) {
    return handleError(res, error);
  });
};

function handleError(res, error) {
  return res.send(500, error);
}