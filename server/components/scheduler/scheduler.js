/**
 * Created by shai on 11/19/14.
 *
 * This creates a global scheduler that will fire every X milliseconds
 * (using setInterval) and check for LeagueEvents in the database.
 * The scheduler fetches every LeagueEvent that has 'pending' status
 * and has a scheduled time before now(). These events are kicked off
 * asynchronously through promises.
 *
 * Event functions are defined in ./event_functions.js
 * They must take a single options hash argument and return a promise.
 */
var db =  require('../../api/models');
var _ = require('lodash');
var logger = require('../../logger');
var EventFunctions = require(__dirname + '/event_functions.js');
var Promise = require("sequelize/node_modules/bluebird");

/**
 * Fetches every LeagueEvent that has a scheduled time before now() and
 * a 'pending' status, or has an 'error' status and has retries left.
 *
 * Since fetching the event IDs and updating their statuses are not one
 * atomic query, this operation may not be thread-safe.
 * TO-DO: Make this operation thread-safe.
 */
var fetchEvents = function(){
    return db.sequelize.transaction().then(function(t) {
        var eventWhere = '"LeagueEvent"."time" <= now() ' +
            '  and ("LeagueEvent"."status" = \'pending\' or ("LeagueEvent"."status" = \'error\' and COALESCE("LeagueEvent"."retries",0) > 0)) '
        return db.LeagueEvent.findAll({where: eventWhere}, {transaction: t}).then(function(events){
            if(events && events.length > 0) {
                var eventIds = _.map(events, 'id').join(',');
                var queryString =
                    'update "LeagueEvents" ' +
                    'set "status" = \'running\',' +
                    ' "retries" = CASE WHEN COALESCE("retries",0) > 0 THEN "retries" - 1 ELSE 0 END ' +
                    'where "id" in (' + eventIds + ')';
                return db.sequelize.query(queryString, null, { raw: true }).then(function (results) {
                    return events;
                });
            }
            return Promise.resolve([]);
        }).then(function(events){
            t.commit();
            return events;
        }).catch(function(error){
            t.rollback();
            logger.log('error','Error while fetching league events: ',  JSON.stringify(error));
            return [];
        });

    });
}
exports.fetchEvents = fetchEvents;

/**
 * Run a single event as a promise, setting the status to 'done' on success or 'error' on failure.
 * @param event
 */
var runEvent = function(event){
    Promise.try(function(){
        var params = event.params;
        var promise = EventFunctions[event.function](params);
        if(!_.isObject(promise) || !_.isFunction(promise.then)){
            logger.log('error','Event function did not return a promise.', {event: JSON.stringify(event)});
            return;
        }
        return promise.then(function(){
            return event.reload().then(function(reloadedEvent){
                reloadedEvent.status = 'done';
                return reloadedEvent.save();
            })
        },function(error){
            return event.reload().then(function(reloadedEvent){
                reloadedEvent.status = 'error';
                return reloadedEvent.save();
            });
        });
    }).catch(function(error){
        logger.log('error','Error trying to run event.', {event: JSON.stringify(event), error: JSON.stringify(error)});
    });
};

/**
 * Fetch events that need to be run and run each of them.
 */
var tick = function(){
    fetchEvents().then(function(events){
        _.each(events, function(event){
            runEvent(event);
        });
    });
};

/* Start up a scheduler, repeating every [frequency] milliseconds.
 * Returns the intervalObject from setInterval.
 */
exports.start = function(frequency){
    return setInterval(tick,frequency);
}