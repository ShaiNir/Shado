if (!global.hasOwnProperty('logger')) {
    var winston = require('winston');
    global.logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)(),
            new (winston.transports.File)({ filename: __dirname + '/' + process.env.NODE_ENV + '.log', level: 'info'})
        ]
    });
}

module.exports = global.logger;