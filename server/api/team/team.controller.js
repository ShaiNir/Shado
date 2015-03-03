'use strict';

var _ = require('lodash');
var db = require('../models');
var Team = db.Team;
var Player = db.Player;
var BPromise = require("sequelize/node_modules/bluebird");
var TeamHelper = require('../team/team.helper.js')

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

// Get all players in a team
exports.players = function(req, res) {
    Team.find(req.params.id).then(function (team) {
        if(!team) { return res.send(404); }
        return team.getPlayers();
    }).then(function(players) {
        return res.json(players);
    }).catch(function(error) {
        return handleError(res, error);
    });
};


// Add user to team
exports.hire_user = function(req,res) {
    var user_id = req.user.id
    if(req.params.user_id != null){
        user_id = req.params.user_id
    }
    var stake_type = 'owner';
    if(req.params.stake != null){
        stake_type = req.params.stake;
    }

    BPromise.bind({}).then(function() {
        return db.Team.find({where: {id:req.params.id},include: [db.User]})
    }).then(function(team) {
        if (!team) {  return BPromise.reject(res.send(404, "Team not found")) }
        this.team = team
        return db.Team.find({where: {special: 'commish', LeagueId: team.LeagueId}})
    }).then(function(commishTeam) {
        if (!commishTeam) {  return BPromise.reject(res.send(404, "Commish team not found for league " + this.team.LeagueId)) }
        this.commishTeam = commishTeam;
        return TeamHelper.verifyStake(req.user.id, this.commishTeam.id)
    }).then(function(isCommishUser){
        if(!isCommishUser){
            return  BPromise.reject(res.sent(403, "Must be commissioner to add user to team"))
        }
        return db.User.find(user_id)
    }).then(function(user){
        if(!user) { return  BPromise.reject(res.send(404, "User to be added not found")) }
        this.user = user
        if (_.pluck(this.team.Users, 'id').indexOf(user_id) >= 0){
            _.findWhere(this.team.Users,{id: user_id})
        } else {
            this.team.addUser(this.user, {role: stake_type})
        }
        return this.team.save()
    }).then(function(team){
        return db.Team.find({where: {id: this.team.id}, include: [db.User]})
    }).then(function(teamWithUsers){
        res.send(200, teamWithUsers);
    }).catch(function(error) {
        handleError(res, error);
    });
}

function handleError(res, error) {
    return res.send(500, error);
}

