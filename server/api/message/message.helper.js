/**
 * Created by shai on 11/7/14.
 */

var _ = require('lodash');
var db = require('../models');
var Message = db.Message;
var logger = require('../../logger');
var mailer = require('nodemailer');
var env = require('../../config/environment');
var escapeHtml = require('escape-html');
var BPromise = require("sequelize/node_modules/bluebird");

var NOREPLY_ADDRESS = 'Shado Sports <noreply@shadosports.com>';

// Based on the message's type, each respective function gives the text for e-mail subjects.
var SUBJECTS_BY_TYPE = {
    '' : function(message){
        return (message.recipient.League.name + " message for " + message.recipient.name);
    },
    'notification' : function(message){
        return (message.recipient.League.name + " notification for " + message.recipient.name);
    },
    'pm': function(message){
        if(message.params.subject != null){
            return "[" + message.recipient.League.name + "] " + message.params.subject
        }
        return (message.recipient.League.name + " private message from " + message.sender.name );
    }
}

// Based on the message's type, each respective function gives HTML to head the e-mail with.
var HEADERS_BY_TYPE = {
    '': function(message){
        return "<h4>"+message.recipient.name+" received a message:</h4>"
    },
    'notification': function(message){
        return "<h4>"+message.recipient.name+" received an notification:</h4>"
    },
    'pm': function(message){
        var html = "<h5>"+message.sender.name+" sent "+message.recipient.name+" a private message:</h5>"
        if(message.params.subject != null){
            html = html + "<h4>" + message.params.subject + "</h4>"
        }
        return html
    }
}


// Sends mail asynchronously with nodemailer
// Returns a promise that resolves with info about the e-mail
var sendEmail = function(mailOptions) {
    var transport = mailer.createTransport(env.emailTransportOptions)
    var sendMailAsync = BPromise.promisify(transport.sendMail, transport);
    if(!env.reallySendEmails){ return BPromise.resolve({}) }
    return sendMailAsync(mailOptions);
};

// Takes a Team with Users included
// Returns an array of e-mail addresses
var teamEmails = function(team){
    return _.map(team.Users, function(user){return user.email});
};

// Takes a Team with Users included or a list of Teams with Users included
// Returns an array of e-mail addresses for each User
var teamAddressList = function(recipients){
    if(Array.isArray(recipients)){
        return _.flatten(_.map(recipients,teamEmails));
    } else {
        return teamEmails(recipients);
    }
};
exports.teamAddressList = teamAddressList;

// Takes a single Message instance and returns an HTML string that represents it
var displayMessage = function(message){
    var messageDate = message.createdAt.toString();
    var messageText = escapeHtml(message.params.text || '');
    var messageSubject = escapeHtml(message.params.subject || '');
    var bodyHtml = "";
    bodyHtml = bodyHtml + "<h5>At " + messageDate + ":</h5>";
    if(messageSubject){
        bodyHtml = "<h4>" + messageSubject + "</h4>"
    }
    bodyHtml = bodyHtml + "<p>" + messageText + "</p>";
    return bodyHtml;
};
exports.displayMessage = displayMessage;

var TEAM_MESSAGE_INCLUDES = [{
        model: db.Team,
        as: 'recipient',
        include: [{model: db.User, required: false},db.League]
    },
    {
        model: db.Team,
        as: 'sender',
        required: false
    }];

var getHeader = function(message){
    return HEADERS_BY_TYPE[(message.type || '')](message)
}

var getSubject = function(message){
    return SUBJECTS_BY_TYPE[(message.type || '')](message)
}

// Takes a message instance with TEAM_MESSAGE_INCLUDES included
var sendMessage = function(message){
    var toAddresses = teamAddressList(message.recipient);
    var bodyHtml = getHeader(message)
    bodyHtml = bodyHtml + displayMessage(message);
    var subject = getSubject(message)
    var mailOptions = {
        from: NOREPLY_ADDRESS, // sender address
        to: toAddresses, // list of receivers
        subject: subject, // Subject line
        html: bodyHtml // html body
    };
    sendEmail(mailOptions);
};

/*
 * Given a message ID, converts that message into an e-mail from the sender to the recipient
 * Returns a promise
 */
exports.messageEmail = function(messageId){
    var messageInfo = {
        where: {id: messageId},
        include: TEAM_MESSAGE_INCLUDES
    };
    return Message.find(messageInfo).then(function(message){
        if(message != null) {
            sendMessage(message);
        } else {
            logger.error('Error sending e-mail: No message found with id ' + messageId);
        }
    }).catch(function(error){
        logger.error('Error creating e-mail: ' + error.message);
    });
};

// Takes an array of message instances.
// Returns an HTML body for a digest-style e-mail.
var digestBody = function(messages){
  var sortedMessages = _.sortBy(messages, 'createdAt');
  return _.map(sortedMessages, displayMessage).join('');
};

var LEAGUE_INCLUDES = [{
        model: db.Team,
        include: [{model: db.User, required: false}],
        where: '("Teams"."special" in (\'commish\') OR "Teams"."special" is null)',
        required: false
    }];
// Returns a promise
var sendLeagueMessage = function(subject, bodyHtml, league){
    var toAddresses = teamAddressList(league.Teams);
    var mailOptions = {
        from: NOREPLY_ADDRESS, // sender address
        to: toAddresses, // list of receivers
        subject: subject, // Subject line
        html: bodyHtml // html body
    };
    return sendEmail(mailOptions);
};

/**
 * Given a set of where conditions for finding the messages to include in the digest,
 * sends an e-mail collecting all messages found.
 * Returns a promise that resolves with the e-mail success info.
 * @param leagueId The league ID to send a digest for
 * @param daySpan The number of days before the present to generate the digest for
 */
exports.digestEmail = function(leagueId, daySpan){
    var leagueInfo = {
        where: {id: leagueId},
        include: LEAGUE_INCLUDES
    }
    return db.League.find(leagueInfo).then(function(league){
        if(league == null){
            return BPromise.reject(new Error('No league found with ID '+leagueId));
        }
        var whereConditions = ['"LeagueId" = ? AND "createdAt" > (now() - interval \'? day\')',league.id, daySpan];
        return Message.findAll({where: whereConditions}).then(function(messages){
            var subject = daySpan + '-day activity summary for ' + league.name;
            var bodyHtml = digestBody(messages);
            return sendLeagueMessage(subject,bodyHtml,league);
        })
    }).catch(function(error){
        logger.error('Error sending digest e-mail: ' + error.message);
    });
};
