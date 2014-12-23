'use strict';

var _ = require('lodash');
var db = require('../models');
var League = db.League;
var logger = require('../../logger')

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

exports.populate = function(req, res) {
  var user = req.user;
  if (user.role !== admin) {
    logger.log("error", "Populating league is restricted to admins only");
    return res.send (401);
  }
  League.find(req.params.id).then(function (league) {
    if (!league) {
      return res.send(404);
    }
    populateLeague(league);
    return res.send(204, league);
    }, function(error) {
      return handleError(res, error);
    });
};

function handleError(res, error) {
  return res.send(500, error);
}

/**
* Created by Sammy on 12/3/14
**/

function populateLeague(league) {
  var commishTeam = {
    name: 'Commisioner Team',
    special: 'commish',
    LeagueId: league.id,
  };

  var freeAgencyTeam = {
    name: 'Free Agency Team',
    special: 'freeagency',
    LeagueId: league.id,
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
      LeagueId: league.id
    });
  });
  teamArray.push(commishTeam, freeAgencyTeam);
  createTeams(teamArray);
}

function createTeams(teamArray) {
  db.Team
      .bulkCreate(teamArray)
    .success(function() {
      logger.log("info", "Suceeded in populating league");
    }).error(function(err) {
      logger.log("error", "Failure to populate league")
    })
}
