var should = require('should');
var db =  require('../../api/models');
var scheduler = require(__dirname + '/scheduler.js')
var _ = require('lodash');

db.sequelize.sync();


describe('getEventIds', function() {
    beforeEach(function(done) {
        // Clear db before testing
        db.LeagueEvent.destroy({},{truncate: true}).then(function() {
            done();
        });
    });

    it('should fetch the event IDs for pending and retriable events', function(done){
        var eventInfo = [{
            description: 'Event 1',
            status: 'pending',
            time: new Date()
        },{
            description: 'Event 2',
            status: 'error',
            time: new Date(),
            retries: 2
        },{
            description: 'Event 3',
            status: 'error',
            time: new Date(),
            retries: 0
        }];
        db.LeagueEvent.bulkCreate(eventInfo).then(function(event){
            scheduler.fetchEvents().then(function(eventsBefore){
                eventsBefore.should.be.instanceOf(Array);
                eventsBefore.length.should.equal(2);
                db.LeagueEvent.findAll({where: {status: 'running'}}).then(function(eventsAfter){
                    eventsAfter.should.be.instanceOf(Array);
                    eventsAfter.length.should.equal(2);
                    _.difference(_.map(eventsBefore,'id'), _.map(eventsAfter,'id')).length.should.equal(0);
                    _.each(eventsAfter,function(event){
                        event.status.should.equal('running');
                        if(event.description == 'Event 1'){
                            event.retries.should.equal(0);
                        }
                        if(event.description == 'Event 2'){
                            event.retries.should.equal(1);
                        }
                    });
                    done();
                })
            });
        });
    });
});