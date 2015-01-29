/**
 * Created by shai on 11/5/14.
 */
'use strict';

var should = require('should');
var db =  require('../models');
var Message = db.Message;
var testUtil = require('../../components/test-util.js');

db.sequelize.sync();

describe('Message Model', function() {
    beforeEach(function(done) {
        testUtil.clearSequelizeTables([Message],done);
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