if (!global.hasOwnProperty('logger')) {
    var winston = require('winston');
    global.logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)(),
            new (winston.transports.File)({ filename: __dirname + '/error.log', level: 'error'})
        ]
    });
}

module.exports = global.logger;