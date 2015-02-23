/**
 * Created by shai on 2/6/15.
 */
var _ = require('lodash');
var BPromise = require("sequelize/node_modules/bluebird");
var db = require('../models');

var async = require('async');
var path = require('path');
var Converter = require('csvtojson').core.Converter;
var logger = require('../../logger');

var fs = BPromise.promisifyAll(require("fs"));

// Fill all teams in a sport of a league with players of the same sport
// Returns a promise
exports.fillTeamsWithPlayersForSport = function(leagueId, sportId){
    var selectedSport = ""
    var selectedLeague = ""
    var selectedTeams = []
    var selectedPlayers = []

    return db.League.find(leagueId).then(function(league) {
        selectedLeague = league
    }).then(function() {
        return db.Sport.find(sportId)
    }).then(function(sport) {
        selectedSport = sport
    }).then(function() {
        return db.Team.findAll({
            where: [{ special: null, SportId: selectedSport.id, LeagueId: selectedLeague.id }]
        });
    }).then(function(teams) {
        selectedTeams = teams
    }).then(function() {
        return db.Player.findAll({
            where: { SportId: selectedSport.id }
        })
    }).then(function(players) {
        selectedPlayers = players
    }).then(function() {
        return assignPlayers(selectedTeams, selectedPlayers);
    })
}


/**
 * Created by Sammy on 1/13/15
 **/

function assignPlayers(teams, players){
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
                    return db.Team.find({
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



/**
 * Created by Sammy on 12/3/14
 **/


exports.populateLeagueWithTeams = function(leagueId, sportId){
    var selectedLeague = "";
    db.League.find(leagueId).then(function (league) {
        if (!league) {
            return res.send(404);
        }
        selectedLeague = league;
    }).then(function () {
        return db.Sport.find(sportId);
    }).then(function(selectedSport) {
        var commishTeam = {
            name: 'Commisioner Team',
            special: 'commish',
            LeagueId: selectedLeague.id,
            SportId: selectedSport.id
        };

        var freeAgencyTeam = {
            name: 'Free Agency Team',
            special: 'freeagency',
            LeagueId: selectedLeague.id,
            SportId: selectedSport.id
        };

  /*      var userTeams = [
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
        ] */

        var userTeams = [
            "Springfield Isotopes",
            "Havana Capitals",
            "Cheyenne Jacksonholes",
            "Las Vegas Leprechauns",
            "Flint Tropics",
            "Louisville Sluggers"
        ]

        var teamArray = []

        _(userTeams).forEach(function(teamName) {
            teamArray.push({
                name: teamName,
                LeagueId: selectedLeague.id,
                SportId: selectedSport.id,
                budget: 200000000
            });
        });
        teamArray.push(commishTeam, freeAgencyTeam);
        return createTeams(teamArray);
    })
}

function createTeams(teamArray) {
    return db.Team
        .bulkCreate(teamArray)
        .success(function() {
            logger.log("info", "Suceeded in populating league");
        }).error(function(err) {
            return logger.log("error", "Failure to populate league")
        })
};

var MLB_DIRECTORY =  __dirname + "/mlb"

//csv's go into a directory in the root folder called 'default_players'.
//Each csv is (currently) a list of players with the following details,
// in no particular order: 'playerName', 'contractExpires', 'realWorldTeam',
// 'defaultSalary'. Capitalization is important for the table names. For
// contractExpires, use a date format. -Sammy 18/11/14.
exports.populateSportFromCSVs = function(sportId) {
    return db.Sport.find(sportId).then(function(sport) {
        return fs.readdirAsync(MLB_DIRECTORY)
    }).then(function(files){
        if (!files.length) {
            return BPromise.reject("No files found in default_players");
        }
        return files;
    }).map(function(file){
        return path.join(MLB_DIRECTORY, file);
    }).map(function(csvPath) {
        var fileStream = fs.createReadStream(csvPath);
        var csvConverter = new Converter({constructResult: true});
        var promise = new BPromise(function (resolve, reject) {
            csvConverter.on("end_parsed", resolve);
            csvConverter.on("error", reject);
        })
        fileStream.pipe(csvConverter);
        return promise;
    }).map(function(csvJson){
        return populateSportWithPlayers(csvJson, sportId);
    });
}

function populateSportWithPlayers(players, sportId) {
    return BPromise.try(function(){
        return players
    }).map(function(player){
        var query = {
            where: {
                name: player.playerName,
                defaultSalary: player.defaultSalary,
                realWorldTeam: player.realWorldTeam,
                contractExpires: player.contractExpires,
                SportId: sportId
            }
        };
        return db.Player.findOrCreate(query).catch(function(error){
            logger.log("error", "Failed to process player " + player + ": " + error);
        });
    })
}


// Creates the sport 'MLB' and populates it with MLB players
exports.createMLB = function(){
    var sportInfo = {
        name: 'MLB'
    }
    return BPromise.bind({}).then(function(){
        return db.Sport.create(sportInfo);
    }).then(function(sport){
        this.sport = sport;
        return exports.populateSportFromCSVs(sport.id)
    }).then(function(){
        return this.sport;
    })
}


exports.leaguePlease = function(leagueInfo){
    return BPromise.bind({}).then(function(){
        return db.Sport.find({where: {name: 'MLB'}})
    }).then(function(sport){
        if(sport == null){
            return exports.createMLB()
        }
        return sport
    }).then(function(sport){
        this.sport = sport
        var defaultLeagueInfo = {
            name: 'Test League',
            status: 'active'
        }
        return db.League.create(defaultLeagueInfo)
    }).then(function(league){
        this.league = league;
        return exports.populateLeagueWithTeams(this.league.id, this.sport.id)
    }).then(function(){
        return exports.fillTeamsWithPlayersForSport(this.league.id, this.sport.id)
    }).then(function(){
        var query = {
            where: {id: this.league.id},
            include: [{
                model: db.Team,
                include: [{model: db.Player, required: false}],
                required: false
            }]
        }
        return db.League.find(query)
    })
}