/**
 * Created by shai on 11/5/14.
 */
'use strict';

var should = require('should');
var db =  require('../models');
var Message = db.Message;

db.sequelize.sync();

describe('Message Model', function() {
    beforeEach(function(done) {
        db.Message.destroy({},{truncate: true}).then(function() {
            done();
        });
    });

    it('should properly translate parameters between text in the DB and JS objects', function(done) {
        var message_params = {text: "You have received a message!"};

        Message.create({_parameters: JSON.stringify(message_params)}).then(function(message){
            message.params.should.be.instanceof(Object);
            message.params.text.should.equal(message_params.text);
            done();
        });

    });
});