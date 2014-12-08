var db = require('../server/api/models');
var League = db.League;
var Team = db.Team;

var commishTeam = {
        name: 'Commish Team',
        special: 'commish'
    };

var freeAgencyTeam = {
    name: 'Free Agency Team',
    special: 'freeagency'
};


var populate = function(user) {
    if user.role !== 'admin' {
        return error;
    }
    db.League.create({
    name: 'Test League',
    id: 1
    }).success(function(league1){
        for(var teamNumber = 1; teamNumber < 21; teamNumber ++) {
            db.Team.create({
                name: 'Team ' + teamNumber
            }).success(function(team) {
                team.setLeague(league1);
                team.save();
            });
        };
    db.Team
        .create(commishTeam)
        .success(function(team) {
            team.setLeague(league1);
            team.save();
        });
    db.Team
        .create(freeAgencyTeam)
        .success(function(team) {
            team.setLeague(league1);
            team.save();
        });
    });
}
