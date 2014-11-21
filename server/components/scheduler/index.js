if (!global.hasOwnProperty('scheduler')) {
    global.scheduler = {
        frequency: require('../../config/environment').schedulerFrequency,
        commands: require(__dirname + '/scheduler.js'),
        start: function(){
            global.scheduler.intervalId = global.scheduler.commands.start(global.scheduler.frequency);
        },
        stop: function(){
            global.scheduler.commands.stop(global.scheduler.intervalId);
        }
    };
}

module.exports = global.scheduler;