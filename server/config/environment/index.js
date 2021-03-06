'use strict';

var path = require('path');
var _ = require('lodash');

function requiredProcessEnv(name) {
  if(!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}

// All configurations will extend these options
// ============================================
var all = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || 9000,

  // db credentials
  dbCreds: {db: 'shado', user: 'shado', dialect: 'postgres'},

  // Should we populate the DB with sample data?
  seedDB: false,

  // Should the scheduler be running?
  schedulerOn: true,

  // How often the league events scheduler should tick (in milliseconds).
  schedulerFrequency: 1000 * 30, // 30 seconds

  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: 'shado-secret'
  },

  // List of user roles
  userRoles: ['guest', 'user', 'admin'],

  facebook: {
    clientID:     process.env.FACEBOOK_ID || 'id',
    clientSecret: process.env.FACEBOOK_SECRET || 'secret',
    callbackURL:  process.env.DOMAIN + '/auth/facebook/callback'
  },

  twitter: {
    clientID:     process.env.TWITTER_ID || 'id',
    clientSecret: process.env.TWITTER_SECRET || 'secret',
    callbackURL:  process.env.DOMAIN + '/auth/twitter/callback'
  },

  google: {
    clientID:     process.env.GOOGLE_ID || 'id',
    clientSecret: process.env.GOOGLE_SECRET || 'secret',
    callbackURL:  process.env.DOMAIN + '/auth/google/callback'
  },

  // Email transport
  emailTransportOptions: {service: 'Mandrill', auth: {user: 'shai@shadosports.com', pass: 'e8Ko53vVtPmIcNDRw7sORw'}},
  reallySendEmails: true,
};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {});