/**
 * Created by shai on 10/9/14.
 */
var superagent = require('superagent');
var agent = superagent.agent();
var db = require('../api/models');
var Promise = require("sequelize/node_modules/bluebird");

// Logs in as a user and returns their authorization token
exports.loginUser = function(request, account, done){
    request
        .post('/auth/local')
        .send(account)
        .end(function (err, res) {
            if (err) {
                throw err;
            }
            done(res.body.token);
        });
}

// Clear db before testing
// Input is an array of Sequelize model types to clear out
exports.clearSequelizeTables = function(typesToClear, done){
    Promise.map(typesToClear,function(type){
        return type.destroy({},{truncate: true});
    }).then(function(){
        done();
    });
}
