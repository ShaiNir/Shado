var db = require('../../api/models/index');
var fs = require('fs')
var BPromise = require("sequelize/node_modules/bluebird")

// Calls a sequelize DB sync
// The session table used by connect-pg-simple needs to be created separately
exports.sync = function(){
    return db.sequelize.sync().then(function() {
        return db.sequelize.query("select * from information_schema.tables where table_name = 'session'");
    }).then(function(rows){
        if(!rows || rows.length == 0){
            var sql = fs.readFileSync(__dirname + '/session-table.sql').toString();
            return db.sequelize.query(sql);
        }
        return BPromise.resolve();
    });
}