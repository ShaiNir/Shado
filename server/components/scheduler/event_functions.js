/**
 * Created by shai on 11/20/14.
 *
 * A list of functions the scheduler is capable of running.
 * Each of these takes a single params object for its parameter.
 * Each of these returns its functionality as a promise.
 */

var logger = require('../../logger');
var BPromise = require("sequelize/node_modules/bluebird");
var _ = require("lodash");

var helpers = {
    Message: require('../../api/message/message.helper.js')
}

/**
 * Log a message to the console
 */
exports.log = function(options){
    if(options.severity == null){
        options.severity = 'info';
    }
    logger.log(options.severity, options.text);
    return BPromise.resolve(null);
}

/**
 * Send a digest e-mail to a single league
 */
exports.leagueDigest = function(options){
    // Ensure daySpan is an integer
    if(options.daySpan == null || !(typeof options.daySpan === 'number') || !(options.daySpan % 1 === 0)){
        return BPromise.reject(new Error('daySpan is not an integer'));
    }
    return helpers.Message.digestEmail(options.LeagueId, options.daySpan);
};