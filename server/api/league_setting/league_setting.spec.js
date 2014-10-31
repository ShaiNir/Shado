'use strict';

var should = require('should');
var request = require('supertest');
var testUtil = require('../../components/test-util.js');
var db = require('../models');
var app =  require('../../app');

db.sequelize.sync();

var agent = request.agent(app);

describe('GET /api/league_settings', function() {

  it('should respond with JSON array', function(done) {
    request(app)
      .get('/api/league_settings')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) return done(err);
        res.body.should.be.instanceof(Array);
        done();
      });
  });
});