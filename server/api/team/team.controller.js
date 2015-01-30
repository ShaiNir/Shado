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
    var currentSport = ""
    var user = req.user;
      if (user.role !== admin) {
        logger.log("error", "Filling teams is restricted to admins only");
        return res.send (403);
      }
    Sport.find(req.params.id).then(function(sport) {
        currentSport = sport
    }).then(function() {
        Team.findAll({
            where: [{special: null, sportId: currentSport.id}]
        }).then(function(teams) {
            Player.findAll().then(function(players) {
                return fillTeams(teams, players)
            })
        }).then(function() {
            return res.send(204, teams)
        }).catch (function(error) {
            return handleError(res, error);
        })
    });
};



function handleError(res, error) {
    return res.send(500, error);
}

/**
* Created by Sammy on 1/13/15
**/

function fillTeams(teams, players) {
    var realWorldTeams = []

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

}
