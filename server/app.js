/**
 * Main application file
 */

'use strict';

var logger = require('./logger')

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

process.on('uncaughtException', function (err) {
    logger.error(err);
});

var express = require('express');
var config = require('./config/environment');

// Connect to database
var db = require('./api/models');

// Populate DB with sample data
if(config.seedDB) { require('./config/seed'); }

// Setup server
var app = express();
var server = require('http').createServer(app);
var socketio = require('socket.io').listen(server);
require('./config/socketio')(socketio);
require('./config/express')(app);
require('./routes')(app);

db.sequelize.sync().complete(function(err) {
    if (err) {
        throw err[0]
    } else {
        // Start server
        server.listen(config.port, config.ip, function () {
            console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
        });
    }
})

if(config.schedulerOn) {
    var scheduler = require('./components/scheduler');
    scheduler.start();
}

// Expose app
exports = module.exports = app;
