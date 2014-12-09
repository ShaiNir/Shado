'use strict';

var db =  require('../models');
var Message = db.Message;
var MessageHelper = require('../message/message.helper');
var _ = require('lodash');


// Verify that the current user is a member of the sending team
var validateUserMemberOfSender = function(req, res, teams){
    var sender = _.find(teams, function(t){return t.id == req.body.senderId})
    if(!sender){        return res.json(404, 'No team found to send message with ID '+req.body.senderId);
    }
    // Verify that the current user is a member of the sending team
    var authorized = _.any(sender.Users, function (user) {
        return user.id == req.user.id
    });
    if (!authorized){ return res.send(401) };
    return null;
}

// Verify that the recipient team exists and is in the same league as the sending team
var validateRecipientAndSender = function(req, res, teams){
    var sender = _.find(teams, function(t){return t.id == req.body.senderId});
    var recipient = _.find(teams, function(t){return t.id == req.body.recipientId});
    if(!sender){
        return res.json(404, 'No team found to send message with ID '+req.body.senderId);
    }
    if(!recipient){
        return res.json(404, 'No team found to receive message with ID '+req.body.senderId);
    }
    if(!(sender.LeagueId == recipient.LeagueId)){
        return res.json(500, 'Sending team '+sender.id+' and receiving team '+recipient.id + ' are not in the same league.');
    }
    return null;
}

/**
 * Send a private message from one team to another
 * Request format:
 * {
 *   senderId: TeamId of the sender,
 *   recipientId: TeamId of the recipient,
 *   message:
 * }
 */
exports.pm = function(req, res) {
    var senderInfo = {
        where: ['"Team".id in (?,?)', req.body.senderId, req.body.recipientId],
        include: [ db.User ]
    }
    db.Team.findAll(senderInfo).then(function(teams){
        if(teams && teams.length == 2) {
            var validateMember = validateUserMemberOfSender(req, res, teams);
            if (validateMember != null) {
                return validateMember;
            }
            var validateRecipient = validateRecipientAndSender(req, res, teams);
            if (validateRecipient != null) {
                return validateRecipient;
            }
            return db.Message.create(req.body).then(function (message) {
                return MessageHelper.messageEmail(message.id).then(function () {
                    res.send(201);
                });
            });
        } else {
            res.json(404, 'Either the sender or recipient ID does not represent an existing team.');
        }
    }, function(error){
        return handleError(res, error);
    });
};

function handleError(res, error) {
    return res.send(500, error);
}
