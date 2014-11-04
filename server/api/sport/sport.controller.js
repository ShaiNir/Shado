'use strict';

var _ = require('lodash');
var Sport = require('../models').Sport;
var fs = require('fs')
var output = []

var Converter=require('csvtojson').core.Converter;
var Player = require('../models').Player;
var async = require('async')
var path = require('path')



// Get list of sports
exports.index = function(req, res) {
    Sport.findAll().then(function (sports) {
        return res.json(200, sports);
    }, function(error){
        return handleError(res, error);
    });
};

// Get a single sport
exports.show = function(req, res) {
    Sport.find(req.params.id).then(function (sport) {
        if(!sport) { return res.send(404); }
        return res.json(sport);
    }, function(error){
        return handleError(res, error);
    });
};

// Creates a new sport in the DB.
exports.create = function(req, res) {
    Sport.create(req.body).then(function(sport){
        return res.json(201, sport);
    },function(error) {
        return handleError(res, error);
    });
};

// Updates an existing sport in the DB.
exports.update = function(req, res) {
    if(req.body.id) { delete req.body.id; }
    Sport.find(req.params.id).then(function (sport) {
        if(!sport) { return res.send(404); }
        sport.updateAttributes(req.body).then(function(sport) {
            return res.json(sport);
        }, function(error) {
            return handleError(res, error);
        });
    }, function(error){
        return handleError(res, error);
    });
};

// Deletes a sport from the DB.
exports.destroy = function(req, res) {
    Sport.find(req.params.id).then(function (sport) {
        if(!sport) { return res.send(404); }
        sport.destroy().then(function(sport) {
            return res.send(204);
        }, function(error) {
            return handleError(res, error);
        });
    }, function(error){
        return handleError(res, error);
    });
};

//Populates a sport's list of default players
exports.populate = function(req, res) {
    Sport.find(req.params.id).then(function (sport) {
        if(!sport) { return res.send(404); }
        parseCsv(sport)
        return res.send(201, sport);
    }, function(error){
        return handleError(res, error);
    });
}

function handleError(res, error) {
    return res.send(500, error);
}

function parseCsv(sport) {
    var directory = './default_players'
    fs.readdir(directory, function(err, files) {
        if (!files.length) {
            return console.log("No files found in default_players");
        }
        async.map(files, function(file, callback) {
            path.join(drectory, file);
            var fileStream = fs.createReadStream(file);
            var csvConverter = new Converter({constructResult:true});
            csvConverter.on("end_parsed",function(jsonObj){
                var players = populateDatabase(jsonObj, sport);
            });
        fileStream.pipe(csvConverter);
        callback();
        });
    });
}

function populateDatabase(players, sport) {
    async.each(players, function(player, callback) {
        Player.findOrCreate({
            where: {
                name: player.name,
                salary: player.salary,
                realWorldTeam: player.realWorldTeam,
                contractExpires: player.contractExpires
            }
        }).success(function(player, created){
            player.setSport(sport);
            player.save();
        })
    callback();
    }, function(err){
        if(err) {
            console.log("Failed to process a player");
        } else {
            console.log("Successfully processed all players.");
        }
    });
}
