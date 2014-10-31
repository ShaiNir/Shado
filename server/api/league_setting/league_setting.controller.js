'use strict';

var _ = require('lodash');
var LeagueSetting = require('../models').LeagueSetting;

// Get list of league_settings
exports.index = function(req, res) {
  LeagueSetting.findAll().then(function (league_settings) {
      return res.json(200, league_settings);
  }, function(error){
      return handleError(res, error);
  });
};

// Get a single league_setting
exports.show = function(req, res) {
    LeagueSetting.find(req.params.id).then(function (league_setting) {
        if(!league_setting) { return res.send(404); }
        return res.json(league_setting);
    }, function(error){
        return handleError(res, error);
    });
};

// Creates a new league_setting in the DB.
exports.create = function(req, res) {
  LeagueSetting.create(req.body).then(function(league_setting){
      return res.json(201, league_setting);
  },function(error) {
      return handleError(res, error);
  });
};

// Updates an existing league_setting in the DB.
exports.update = function(req, res) {
  if(req.body.id) { delete req.body.id; }
  LeagueSetting.find(req.params.id).then(function (league_setting) {
      if(!league_setting) { return res.send(404); }
      league_setting.updateAttributes(req.body).then(function(league_setting) {
          return res.json(league_setting);
      }, function(error) {
          return handleError(res, error);
      });
  }, function(error){
      return handleError(res, error);
  });
};

// Deletes a league_setting from the DB.
exports.destroy = function(req, res) {
  LeagueSetting.find(req.params.id).then(function (league_setting) {
      if(!league_setting) { return res.send(404); }
      league_setting.destroy().then(function(league_setting) {
          return res.send(204);
      }, function(error) {
          return handleError(res, error);
      });
  }, function(error){
      return handleError(res, error);
  });
};

function handleError(res, error) {
  return res.send(500, error);
}
