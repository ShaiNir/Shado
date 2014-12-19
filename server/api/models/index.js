if (!global.hasOwnProperty('db')) {
    var Sequelize = require('sequelize')
        , sequelize = null

    var env = require('../../config/environment');
    var dbCreds = env.dbCreds;
    var _ = require('lodash');

    var herokuPsqlEnvVar = _.find(_.keys(process.env),function(key){
        return key.match(/^HEROKU_POSTGRESQL_\w*_URL$/);
    });

    if (herokuPsqlEnvVar) {
        // the application is executed on Heroku ... use its postgres database
        var match = process.env[herokuPsqlEnvVar].match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)

        sequelize = new Sequelize(match[5], match[1], match[2], {
            dialect:  'postgres',
            protocol: 'postgres',
            port:     match[4],
            host:     match[3],
            logging:  true
        })
    } else {
        sequelize =  new Sequelize(dbCreds.db, dbCreds.user, null, {dialect: dbCreds.dialect});
    }

    global.db = {
        Sequelize: Sequelize,
        sequelize: sequelize,
        User:  sequelize.import(__dirname + '/user'),
        League: sequelize.import(__dirname + '/league'),
        LeagueSetting:  sequelize.import(__dirname + '/league_setting'),
        Team: sequelize.import(__dirname + '/team'),
        Player: sequelize.import(__dirname + '/player'),
        PlayerAssignment: sequelize.import(__dirname + '/player_assignment'),
        Stake: sequelize.import(__dirname + '/stake'),
        Sport: sequelize.import(__dirname + '/sport'),
        Transaction: sequelize.import(__dirname + '/transaction'),
        TransactionItem: sequelize.import(__dirname + '/transaction_item'),
        TransactionApproval: sequelize.import(__dirname + '/transaction_approval'),
        Message: sequelize.import(__dirname + '/message'),
        LeagueEvent: sequelize.import(__dirname + '/league_event')
    }

    /*
     Associations can be defined here. E.g. like this:
     global.db.User.hasMany(global.db.SomethingElse)
     */

    global.db.League.hasMany(global.db.Team);
    global.db.Team.belongsTo(global.db.League);
    global.db.Team.belongsTo(global.db.Sport);

    global.db.League.hasMany(global.db.LeagueSetting);

    global.db.Player.belongsTo(global.db.Sport);

    global.db.Player.hasMany(global.db.Team, {through: global.db.PlayerAssignment});
    global.db.Team.hasMany(global.db.Player, {through: global.db.PlayerAssignment});

    global.db.User.hasMany(global.db.Team, {through: global.db.Stake});
    global.db.Team.hasMany(global.db.User, {through: global.db.Stake});

    global.db.Transaction.belongsTo(global.db.Transaction, {as: 'series'});
    global.db.Transaction.belongsTo(global.db.League);
    global.db.Transaction.hasMany(global.db.TransactionApproval);
    global.db.Transaction.belongsTo(global.db.Team, {as: 'author'});

    global.db.Transaction.hasMany(global.db.TransactionItem);
    global.db.TransactionItem.belongsTo(global.db.Transaction);
    global.db.TransactionItem.belongsTo(global.db.Team, {as: 'source'});
    global.db.TransactionItem.belongsTo(global.db.Team, {as: 'destination'});

    global.db.TransactionApproval.belongsTo(global.db.Team);

    global.db.Message.belongsTo(global.db.Team, {as: 'sender'});
    global.db.Message.belongsTo(global.db.Team, {as: 'recipient'}); // Used for messages to specific teams
    global.db.Message.belongsTo(global.db.League); // Only used for league-wide messages

    global.db.LeagueEvent.belongsTo(global.db.League);
}

module.exports = global.db;
