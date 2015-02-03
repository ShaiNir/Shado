'use strict';

var _ = require('lodash');
var Team = require('../models').Team;
var Player = require('../models').Player;

// Get list of teams
exports.index = function(req, res) {
    Team.findAll().then(function (teams) {
        return res.json(200, teams);
    }, function(error){
        return handleError(res, error);
    });
};

// Get a single team
exports.show = function(req, res) {
    Team.find(req.params.id).then(function (team) {
        if(!team) { return res.send(404); }
        return res.json(team);
    }, function(error){
        return handleError(res, error);
    });
};

// Creates a new team in the DB.
exports.create = function(req, res) {
    Team.create(req.body).then(function(team){
        return res.json(201, team);
    },function(error) {
        return handleError(res, error);
    });
};

// Updates an existing team in the DB.
exports.update = function(req, res) {
    if(req.body.id) { delete req.body.id; }
    Team.find(req.params.id).then(function (team) {
        if(!team) { return res.send(404); }
        team.updateAttributes(req.body).then(function(team) {
            return res.json(team);
        }, function(error) {
            return handleError(res, error);
        });
    }, function(error){
        return handleError(res, error);
    });
};

// Deletes a team from the DB.
exports.destroy = function(req, res) {
    Team.find(req.params.id).then(function (team) {
        if(!team) { return res.send(404); }
        team.destroy().then(function(team) {
            return res.send(204);
        }, function(error) {
            return handleError(res, error);
        });
    }, function(error){
        return handleError(res, error);
    });
};

exports.players = function(req, res) {
    Team.find(req.params.id).then(function (team) {
        if(!team) { return res.send(404); }
        team.getPlayers().then(function(players) {
            return res.json(players);
        }, function(error) {
            return handleError(res, error);
        });
    },  function(error){
        return handleError(res, error);
    });
};

exports.fill = function(req, res) {
    var selectedSport = ""
    var selectedTeams = []
    var selectedPlayers = []

    var user = req.user;
    if (user.role !== 'admin') {
        logger.log("error", "Filling teams is restricted to admins only");
        return res.send (403);
    }
    Sport.find(req.params.sport_id).then(function(sport) {
        return setSelectedSport(sport);
    }).then(function() {
        return Team.findAll({
            where: [{ special: null, SportId: selectedSport.id, LeagueId: req.params.league_id }]
        });
    }).then(function(teams) {
        return setSelectedTeams();
    }).then(function() {
        return Player.findAll({
            where: { SportId: selectedSport.id }
        })
    }).then(function(players) {
        return setSelectedPlayers(players);
    }).then(function() {
        return assignPlayers(setSelectedTeams, setSelectedPlayers);
    }).then(function() {
        return res.send(204);
    }).catch (function(error) {
        return handleError(res, error);
    });
};

function handleError(res, error) {
    return res.send(500, error);
}

/**
* Created by Sammy on 1/13/15
**/

function setSelectedSport(sport) {
    selectedSport = sport;
  }

function setSelectedTeams(teams) {
    selectedTeams = teams;
  }

function setSelectedPlayers(players) {
    selectedPlayers = players;
  }


function assignPlayers(teams, players) {
    var realWorldTeams = []

    getRealWorldTeams(players);
    BPromise.map(realWorldTeams, function(realTeam) {
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
                    freeAgentTeam.save();
                });
                } else {
                    teams[realTeamIndex].addPlayer(realTeamPlayer);
                    teams[realTeamIndex].save();
                }
            });
        });
    });
  }

function getRealWorldTeams(players) {
    realWorldTeams = _.chain(players)
      .pluck('realWorldTeam')
      .uniq()
      .value();
    }
