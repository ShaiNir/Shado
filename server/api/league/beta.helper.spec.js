/**
 * Created by shai on 2/18/15.
 */
'use strict';

var should = require('should');
var db =  require('../models');
var BetaHelper = require('../league/beta.helper');
var BPromise = require("sequelize/node_modules/bluebird");
var _ = require('lodash');
var testUtil = require('../../components/test-util.js');

describe('leaguePlease', function() {
    this.timeout(10000)
    beforeEach(function(done) {
        // Clear db before testing
        var typesToClear = [
            db.Sport,
            db.Team,
            db.League,
            db.LeagueSetting,
            db.Player,
            db.PlayerAssignment
        ];
        testUtil.clearSequelizeTables(typesToClear,done);
    });

    it('should create a sport and a league', function(done) {
        BetaHelper.leaguePlease().then(function(league){
            done()
        })
    });


    it('should create a sport and two leagues if applied twice', function(done) {
        BetaHelper.leaguePlease().then(function() {
            return BetaHelper.leaguePlease();
        }).then(function(){
            var query = {
                include: [{
                    model: db.Team,
                    include: [{model: db.Player, required: false}],
                    required: false
                }]
            }
            return db.League.findAll(query)
        }).then(function(leagues){
            leagues.length.should.equal(2)
            done()
        })
    });
})