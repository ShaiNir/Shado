'use strict';

var User = require('../models').User;
var passport = require('passport');
var config = require('../../config/environment');
var jwt = require('jsonwebtoken');
var _ = require('lodash');

var validationError = function(res, err) {
  return res.json(422, err);
};

// Columns we allow to be returned
// salt and hashedPassword should NEVER be exposed in the API
var internalProfileAttributes = ['id','name','phone','email','role','franchiseName','budget','provider'];

/**
 * Get list of users
 * restriction: 'admin'
 */
exports.index = function(req, res) {
    User.findAll({attributes: internalProfileAttributes}).then(function (users) {
        return res.json(200, bulkOmitPasswordAndSalt(users));
    }, function(error){
        return res.send(500, error);
    });
};

/**
 * Creates a new user

exports.create = function(req, res) {
    var newUser = User.build(req.body)
    newUser.save().success(function(user){
        return res.json(201, user);
    }).error(function(error) {
        return validationError(res, error);
    });
};*/
exports.create = function (req, res, next) {
  var newUser = User.build(req.body);
  newUser.provider = 'local';
  newUser.role = 'manager';
  newUser.save().then(function(user) {
    var token = jwt.sign({id: user.id }, config.secrets.session, { expiresInMinutes: 60*5 });
    res.json({ token: token });
  },function(error){
      return validationError(res, error);
  });
};

/**
 * Get a single user
 */
exports.show = function (req, res, next) {
  User.find(req.params.id).then(function (user) {
      if(!user) { return res.send(401); }
      return res.json(user.profile);
  }, function(error){
      return next(error);
  });
};

/**
 * Deletes a user
 * restriction: 'admin'
 */
exports.destroy = function(req, res) {
  User.find(req.params.id).then(function (user) {
      user.destroy().then(function(user) {
          return res.send(204);
      }, function(error) {
          return res.send(500, error);
      });
  }, function(error){
      return res.send(500, error);
  });
};

/**
 * Change a users password
 */
exports.changePassword = function(req, res, next) {
  var userId = req.user.id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  User.find(req.params.id).then(function (user) {
    if(user.authenticate(oldPass)) {
      user.password = newPass;
      user.save().then(function() {
        res.send(200);
      },function(error){
          return validationError(res, error);
      });
    } else {
      res.send(403);
    }
  }, function(error){
      return res.send(500, error);
  });
};

/**
 * Get my info
 */
exports.me = function(req, res, next) {
    User.find({where: {id: req.user.id}, attributes: internalProfileAttributes}).then(function(user){
     if (!user) return res.json(401);
     res.json(user);
  }, function(error) {
      return next(error);
  });
};

/**
 * Authentication callback
 */
exports.authCallback = function(req, res, next) {
  res.redirect('/');
};