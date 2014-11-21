/**
 * Created by shai on 11/20/14.
 *
 * A list of functions the scheduler is capable of running.
 * Each of these takes a single params object for its parameter.
 * Each of these returns its functionality as a promise.
 */

var logger = require('../../logger');
var Promise = require("sequelize/node_modules/bluebird");

/**
 * Log a message to the console
 */
exports.log = function(options){
    if(options.severity == null){
        options.severity = 'info';
    }
    logger.log(options.severity, options.text);
    return Promise.resolve(null);
}