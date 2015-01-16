var should = require('should');
var db =  require('../models');
var TeamHelper = require('../team/team.helper');
var _ = require('lodash');
var testUtil = require('../../components/test-util.js');
var BPromise = require("sequelize/node_modules/bluebird");

db.sequelize.sync();

// Sets up a league with one team and two players
// The team's total salary and budget are both 10000
var setUpLeague= function(done){
    db.League.create().then(function(league){
        var teamInfo = {
            name: "Team Awesome",
            LeagueId: league.id,
            budget: 10000
        };
        db.Team.create(teamInfo).then(function(team){
            db.Player.create({name: "Player 1"}).then(function(player1){
                team.addPlayer(player1, {status: 'active', salary: 6000});
                team.save().then(function(){
                    db.Player.create({name: "Player 2"}).then(function(player2){
                        team.addPlayer(player2, {status: 'active', salary: 4000});
                        team.save().then(function(){
                            var models = {
                                league: league,
                                team: team,
                                player1: player1,
                                player2: player2
                            };
                            done(models);
                        });
                    });
                });
            });
        });
    });
};

describe('Validate Roster For Team', function() {
    beforeEach(function(done) {
        // Clear db before testing
        db.Team.destroy({},{truncate: true}).then(function() {
            db.Player.destroy({},{truncate: true}).then(function() {
                db.LeagueSetting.destroy({},{truncate: true}).then(function() {
                    db.League.destroy({},{truncate: true}).then(function() {
                        done();
                    });
                });
            });
        });
    });

    it('should return an empty array if there are no limits', function(done){
        setUpLeague(function(su) {
            TeamHelper.validateRosterForTeam(su.team.id).then(function(validations){
                validations.should.be.instanceof(Array);
                validations.length.should.equal(0);
                done();
            });
        });
    });


    it('should return an empty array if the team fulfills all limits', function(done){
        setUpLeague(function(su) {
            var settings = [
                {LeagueId: su.league.id, key: 'SALARY_HARD_CAP', value: 10000},
                {LeagueId: su.league.id, key: 'SALARY_SOFT_CAP', value: null},
                {LeagueId: su.league.id, key: 'SALARY_SOFT_CAP_TAX_PERCENT', value: 25},
                {LeagueId: su.league.id, key: 'ROSTER_CAP', value: 3}
            ]
            db.LeagueSetting.bulkCreate(settings).then(function(leagueSettings){
                TeamHelper.validateRosterForTeam(su.team.id).then(function(validations){
                    validations.should.be.instanceof(Array);
                    validations.length.should.equal(0);
                    done();
                });
            });
        });
    });


    it('should alert when the team has too many players', function(done){
        setUpLeague(function(su) {
            var settings = [
                {LeagueId: su.league.id, key: 'ROSTER_CAP', value: 1}
            ]
            db.LeagueSetting.bulkCreate(settings).then(function(leagueSettings){
                TeamHelper.validateRosterForTeam(su.team.id).then(function(validations){
                    validations.should.be.instanceof(Array);
                    validations.length.should.equal(1);
                    validations[0].should.equal(TeamHelper.messages.TOO_MANY_PLAYERS);
                    done();
                });
            });
        });
    });

    it('should alert when the team\'s total salary is over the hard cap', function(done){
        setUpLeague(function(su) {
            var settings = [
                {LeagueId: su.league.id, key: 'SALARY_HARD_CAP', value: 9000}
            ]
            db.LeagueSetting.bulkCreate(settings).then(function(leagueSettings){
                TeamHelper.validateRosterForTeam(su.team.id).then(function(validations){
                    validations.should.be.instanceof(Array);
                    validations.length.should.equal(1);
                    validations[0].should.equal(TeamHelper.messages.HARD_CAP);
                    done();
                });
            });
        });
    });

    it('should alert when the team\'s total salary is over its budget', function(done){
        setUpLeague(function(su) {
            su.team.budget = 8000;
            su.team.save().then(function(team){
                TeamHelper.validateRosterForTeam(su.team.id).then(function(validations){
                    validations.should.be.instanceof(Array);
                    validations.length.should.equal(1);
                    validations[0].should.equal(TeamHelper.messages.BUDGET);
                    done();
                });
            });
        });
    });

    it('should alert when the team\'s total salary is over the soft cap and the team can\'t afford the soft cap tax', function(done){
        setUpLeague(function(su) {
            var settings = [
                {LeagueId: su.league.id, key: 'SALARY_SOFT_CAP', value: 8000},
                {LeagueId: su.league.id, key: 'SALARY_SOFT_CAP_TAX_PERCENT', value: 100}
            ]
            db.LeagueSetting.bulkCreate(settings).then(function(leagueSettings){
                TeamHelper.validateRosterForTeam(su.team.id).then(function(validations){
                    validations.should.be.instanceof(Array);
                    validations.length.should.equal(1);
                    validations[0].should.equal(TeamHelper.messages.BUDGET_WITH_TAX);
                    done();
                });
            });
        });
    });
});


describe('getAutoPurgedPlayers', function() {
    beforeEach(function(done) {
        // Clear db before testing
        db.Team.destroy({},{truncate: true}).then(function() {
            db.Player.destroy({},{truncate: true}).then(function() {
                db.LeagueSetting.destroy({},{truncate: true}).then(function() {
                    db.League.destroy({},{truncate: true}).then(function() {
                        done();
                    });
                });
            });
        });
    });

    it('should return the highest-paid player if the team is over its limit', function(done){
        setUpLeague(function(su) {
            var settings = [
                {LeagueId: su.league.id, key: 'SALARY_HARD_CAP', value: 9000}
            ]
            db.LeagueSetting.bulkCreate(settings).then(function(){
                db.Team.find({
                    where: {id: su.team.id},
                    include:  [
                        {model: db.League, include: [{model: db.LeagueSetting, required: false}]},
                        {model: db.Player}
                    ]
                }).then(function(team){
                    var playerList = TeamHelper.getAutoPurgedPlayers(team);
                    playerList.should.be.instanceOf(Array);
                    playerList.length.should.equal(1);
                    playerList[0].should.equal(su.player1.id);
                    done();
                });

            });
        });
    });
});



describe('TeamHelper.verifyStake', function() {
    beforeEach(function(done) {
        // Clear db before testing
        var typesToClear = [
            db.Team,
            db.League,
            db.Stake,
            db.User
        ];
        testUtil.clearSequelizeTables(typesToClear,done);
    })

    var setUpTeamAndUsers = function(){
        return BPromise.bind({}).then(function(){
            return db.League.create();
        }).then(function(league) {
            this.league = league;
            return db.Team.create({name: "Team", LeagueId: this.league.id});
        }).then(function(team) {
            this.team = team;
            return db.User.create({name: "User 1"});
        }).then(function(user1) {
            this.user1 = user1;
            this.team.addUser(user1, {role: 'owner'});
            return this.team.save()
        }).then(function(team) {
            this.team = team;
            return db.User.create({name: "User 2"});
        }).then(function(user2) {
            this.user2 = user2;
            return this;
        })
    }

    it('Should accept a correct user', function(done){
        setUpTeamAndUsers().then(function(){
            return TeamHelper.verifyStake(this.user1.id,this.team.id)
        }).then(function(result){
            result.should.be.ok;
            done();
        });
    })

    it('Should reject an incorrect user', function(done){
        setUpTeamAndUsers().then(function(){
            return TeamHelper.verifyStake(this.user2.id,this.team.id)
        }).then(function(result){
            result.should.not.be.ok;
            done();
        });
    })
})