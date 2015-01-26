/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');

module.exports = function(app) {

  // Insert routes below
  app.use('/api/player_assignments', require('./api/player_assignment'));
  app.use('/api/stakes', require('./api/stake'));
  app.use('/api/leagues', require('./api/league'));
  app.use('/api/league_settings', require('./api/league_setting'));
  app.use('/api/teams', require('./api/team'));
  app.use('/api/players', require('./api/player'));
  app.use('/api/sports', require('./api/sport'));
  app.use('/api/sports', require('./api/sport'));
  app.use('/api/users', require('./api/user'));
  app.use('/api/transactions', require('./api/transaction'));
  app.use('/api/messages', require('./api/message'));
    app.use('/api/insight', require('./api/insight'));

  app.use('/auth', require('./auth'));
  
  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get(function(req, res) {
      res.sendfile(app.get('appPath') + '/index.html');
    });
};
