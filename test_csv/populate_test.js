/**
* Created by Sammy on 11/18/14.
**/

var Converter = require('csvtojson').core.Converter;
var db = require('../server/api/models');
var Sport = db.Sport;
var Player = db.Player;
var fs = require('fs')

var Populate = (function(){
  var _parseCsv = function(csv, sport) {
    var fileStream = fs.createReadStream(csv);
    var csvConverter = new Converter({constructResult:true});
    csvConverter.on("end_parsed",function(jsonObj){
      populateDatabase(jsonObj, sport);
      });
    fileStream.pipe(csvConverter);
  };

  var populateDatabase = function(players, sport) {
    players.map(function(player) {
      var promise = Player.findOrCreate({
        where: {
          name: player.playerName,
          defaultSalary: player.defaultSalary,
          realWorldTeam: player.realWorldTeam,
          contractExpires: player.contractExpires
        }
      });
      promise.success(function(player, created){
        player.setSport(sport);
        player.save();
      });
      promise.error(function(err){
        console.log("error", "Failed to process player: " + player.playerName);
      });
    });
  }
  return {
    parseCsv : _parseCsv,
  }
}());
module.exports = Populate;
