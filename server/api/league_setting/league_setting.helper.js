/**
 * Created by shai on 11/14/14.
 */
'use strict';

var _ = require('lodash');

/**
 * Given a league with LeagueSettings included, returns the value
 * of the setting with the given key. If no such setting is found,
 * returns null. If no list of settings is included, throws error.
 */
exports.getSetting = function(league, searchKey){
    if(!league.LeagueSettings){
        throw new Error('Trying to get LeagueSettings from league but no list of settings is included.');
    }
    var foundSetting = _.find(league.LeagueSettings, function(setting){
        if(setting.key == searchKey){
           return true;
       }
       return false;
    });
    if(foundSetting == null){
        return null;
    }
    return foundSetting.value;
}