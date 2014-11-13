/**
 * Created by shai on 11/7/14.
 */

var _ = require('lodash');
var db = require('../models');
var Message = db.Message;
var logger = require('../../logger');
var mailer = require('nodemailer');

/*
 * Given a message ID, converts that message into an e-mail from the sender to the recipient
 * Returns a promise
 */
exports.email = function(messageId){
    var messageInfo = {
        where: {id: messageId},
        include: [{
            model: db.Team,
            as: 'recipient',
            include: [{model: db.User, required: false},db.League]
        },
        {
            model: db.Team,
            as: 'sender',
            required: false
        },
        db.League ]
    }
    return Message.find(messageInfo).then(function(message){
            if(message != null) {
                var toAddresses = _.map(message.recipient.Users, function(user){return user.email});
                var bodyHtml = "<h3>"+message.sender.name+" sent "+message.recipient.name+" a private message:</h3>"
                bodyHtml = bodyHtml + "<br/>"
                bodyHtml = bodyHtml + "<p>" + message.params.text + "</p>"
                var subject = (message.recipient.League.name + " message for " + message.recipient.name);
                var mailOptions = {
                    from: 'Shado Sports <noreply@shadosports.com>', // sender address
                    to: toAddresses, // list of receivers
                    subject: subject, // Subject line
                    html: bodyHtml // html body
                };
                var transportOptions = {service: 'Gmail', auth: {user: 'messagetest@shadosports.com', pass: 'thisisatest'}};
                mailer.createTransport(transportOptions).sendMail(mailOptions, function(err, info){
                    if(err){
                        logger.error('Error sending e-mail: ' + error.message);
                    }
                });
            } else {
                logger.error('Error sending e-mail: No message found with id ' + messageId);
            }
        },
        function(error){
            logger.error('Error creating e-mail: ' + error.message);
        });
};