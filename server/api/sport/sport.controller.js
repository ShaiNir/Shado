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

//csv's go into a directory in the root folder called 'default_players'.
//Each csv is (currently) a list of players with the following details,
// in no particular order: 'name', 'contractExpires', 'realWorldTeam',
// 'salary'. Capitalization is important for the table names. For
// contractExpires, use a date format. -Sammy
function parseCsv(sport) {
    var directory = "./default_players"
    fs.readdir(directory, function(err, files) {
        if (!files.length) {
            return logger.log("No files found in default_players");
        }
        var csvPaths = files.map(function(file) {
            return path.join(directory, file);
            });
        async.map(csvPaths, function(file, callback) {
            var fileStream = fs.createReadStream(file);
            var csvConverter = new Converter({constructResult:true});
            csvConverter.on("end_parsed",function(jsonObj){
                populateDatabase(jsonObj, sport);
            });
        fileStream.pipe(csvConverter);
        callback();
        });
    }, function(error){
        logger.log("There was an error in reading the directory.");
    });
}

function populateDatabase(players, sport) {
    async.each(players, function(player, callback) {
        var promise = Player.findOrCreate({
            where: {
                name: player.name,
                salary: player.salary,
                realWorldTeam: player.realWorldTeam,
                contractExpires: player.contractExpires
            }
        });
        promise.success(function(player, created){
            player.setSport(sport);
            player.save();
        });
        promise.error(function(err){
            logger.log("Failed to process player: " + player.name);
        });
        callback();
    });
}
