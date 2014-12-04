'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');
var db = require('../models');
var Sport = db.Sport;
var Player = db.Player;

var baseCsv = ("./test_csv/base_sheet.csv");
var missingCsv = ("./test_csv/missing_sheet.csv");
var incorrectCsv = ("./test_csv/incorrect_sheet.csv");
var duplicateCsv = ("./test_csv/duplicate_sheet.csv");

var populateTest = require("../../../test_csv/populate_test.js");

describe('GET /api/sports', function() {

  it('should respond with JSON array', function(done) {
    request(app)
      .get('/api/sports')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
        res.body.should.be.instanceof(Array);
        done();
      });
  });
});

/**
* Created by Sammy on 11/18/14.
**/

describe('POST /api/:id/sports/populate', function() {

  beforeEach(function(done) {
    db.Sport.destroy({}, {truncate: true}).then(function() {
      db.Player.destroy({}, {truncate: true}).then(function() {
        db.Sport.create({ name:'Test MLB', id:1 }).then(function(sport) {
        done();
        });
      });
    });
  });

  it('should have a sport', function(done) {
    db.Sport.find(1).then(function() {
      done();
    });
  });

  it('should find all players created in a sport', function(){
    db.Sport.find(1).then(function(sport) {
      populateTest.parseCsv(baseCsv, sport);
    }).success(function() {
      db.Player.findAll({ where: {SportId: 1} }).then(function(players) {
      });
    });
  });

  it('should fail if data is missing', function() {
    db.Sport.find(1).then(function(sport) {
      populateTest.parseCsv(missingCsv, sport);
    }).then(function () {
      should(false).ok
    }, function (err) {
        should.exist(err);
      }
    );
  });

  it('should fail if data is of incorrect type', function() {
    db.Sport.find(1).then(function(sport) {
      populateTest.parseCsv(incorrectCsv, sport);
    }).then(function () {
      should(false).ok
    }, function (err) {
        should.exist(err);
    });
  });

  it('should fail if data is duplicated', function() {
    db.Sport.find(1).then(function(sport) {
      populateTest.parseCsv(baseCsv, sport);
      populateTest.parseCsv(duplicateCsv, sport);
    }).then(function () {
      should(false).ok
    }, function (err) {
        should.exist(err);
      }
    );
  });
});
