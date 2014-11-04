'use strict';

var _ = require('lodash');
var Sport = require('../models').Sport;
var fs = require('fs')
var output = []

var Converter=require('csvtojson').core.Converter;
var Player = require('../models').Player;
var async = require('async')



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

//Populates a sport with the default players.
exports.populate = function(req, res) {
    Sport.find(req.params.id).then(function (sport) {
        if(!sport) { return res.send(404); }
        var fileStream = fs.createReadStream('mlb_ari.csv')
//new converter instance
        var csvConverter = new Converter({constructResult:true});
//end_parsed will be emitted once parsing finished
        csvConverter.on("end_parsed",function(jsonObj){
           console.log(jsonObj); //here is your result json object
           populateDatabase(jsonObj)
        });
//read from file
        fileStream.pipe(csvConverter);
    }, function(error){
        return handleError(res, error);
    });
}

function handleError(res, error) {
    return res.send(500, error);
}

function populateDatabase(players) {
    console.log("Running populateDatabase");
    async.each(players, function(player, callback) {
        console.log("Running on " + player.name);
        console.log("Player has salary of " + player.salary);
        console.log("Player contract expires at " + player.contractExpires);
        console.log("Creating player...")
        callback();
    });
}
