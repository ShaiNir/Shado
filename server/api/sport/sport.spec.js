'use strict';

var should = require('should');
var app = require('../../app');
var request = require('supertest');
var testUtil = require('../../components/test-util.js');
var db = require('../models');
var Sport = db.Sport;
var Player = db.Player;

var baseCsv = ("./server/components/test_csv/base_sheet.csv");
var missingCsv = ("./server/components/test_csv/missing_sheet.csv");
var incorrectCsv = ("./server/components/test_csv/incorrect_sheet.csv");
var duplicateCsv = ("./server/components/test_csv/duplicate_sheet.csv");

var populateTest = require('../../components/populate_sport_test.js');

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

describe('POST /api/sports/:id/populate', function() {
  var TEST_SPORT_ID = 1

  beforeEach(function(done) {
    var typesToClear = [
      db.Sport,
      db.Player
    ];
    testUtil.clearSequelizeTables(typesToClear,done);
  });

  beforeEach(function(done) {
    db.Sport.create({ name:'Test MLB', id:TEST_SPORT_ID }).then(function(sport) {
      done();
    });
  });

  it('should have a sport', function(done) {
    db.Sport.find(TEST_SPORT_ID).then(function() {
      done();
    });
  });

  it('should find all players created in a sport', function(done){
    db.Sport.find(TEST_SPORT_ID).then(function(sport) {
      return populateTest.parseCsv(baseCsv, sport);
    }).then(function() {
      return db.Player.findAll({ where: {SportId: TEST_SPORT_ID} })
    }).then(function(result) {
      result.should.be.above(0);
    });
  });

  it('should fail if data is missing', function(done) {
    db.Sport.find(TEST_SPORT_ID).then(function(sport) {
      return populateTest.parseCsv(missingCsv, sport);
    }).then(function () {
      should(false).ok
    }).catch(function(err)  {
      should.exist(err);
      done()
    });
  });

  it('should fail if data is of incorrect type', function(done) {
    db.Sport.find(TEST_SPORT_ID).then(function(sport) {
      return populateTest.parseCsv(incorrectCsv, sport);
    }).then(function () {
      should(false).ok
    }).catch(function (err) {
      should.exist(err);
      done();
    });
  });

  it('should fail if data is duplicated', function(done) {
    db.Sport.find(TEST_SPORT_ID).then(function(sport) {
      return populateTest.parseCsv(baseCsv, sport);
    }).then(function() {
      return populateTest.parseCsv(duplicateCsv, sport);
    }).then(function () {
      should(false).ok
    }).catch(function (err) {
      should.exist(err);
      done();
    })
  });
});
