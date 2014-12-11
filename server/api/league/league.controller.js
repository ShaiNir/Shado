'use strict';

var _ = require('lodash');
var db = require('../models');
var League = db.League;

var DEFAULT_USER_TEAM_TOTAL = 20

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
  for(var teamNumber = 1; teamNumber === DEFAULT_USER_TEAM_TOTAL; teamNumber ++) {
    buildUserTeams(teamNumber, league)
  };
  buildSpecialTeams(league);
};

function buildUserTeams(teamNumber, league) {
  db.Team.create({
    name: 'Team ' + teamNumber,
  }).success(function(team) {
    team.setLeague(league);
    team.save();
  }).error(function(err) {
    logger.log("error", "Failed to create user team " + teamNumber);
  });
};

function buildSpecialTeams(league) {
  var commishTeam = {
    name: 'Commisioner Team',
    special: 'commish'
  };

  var freeAgencyTeam = {
    name: 'Free Agency Team',
    special: 'freeagency'
  };

  db.Team
    .create(commishTeam)
    .success(function(team) {
      team.setLeague(league);
      team.save();
  }).error(function(err) {
    logger.log("error", "Failed to create commisioner team");
  });
  db.Team
    .create(freeAgencyTeam)
    .success(function(team) {
      team.setLeague(league);
      team.save();
  }).error(function(err) {
    logger.log("error", "Failed to create free agency team");
  });
}
