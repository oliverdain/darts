var PouchDB = require('pouchdb');
var dartEvents = require('../shared/dart-events');
var async = require('async');
var assert = require('assert');


describe('resolveChanges', function() {
  var db;
  var resolveChanges;

  var addUsers = function(cb) {
    var users = ['Oliver', 'Sandy', 'Gourdy', 'Alice', 'Nutter'];
    var ranking = [];
    var second = 0;
    async.each(users, function(user, eachCb) {
      ranking.push(user);
      var thisRanking = ranking.slice(0);
      var newDoc = {_id: '2014-04-12T00:00:0' + second,
        'event': {type: 'New Player', player: user},
          ranking: thisRanking};
      second = second + 1;
      db.put(newDoc, function(err, res) {
        if (err) assert.fail(err);
        eachCb();
      });
    }, function(err) {
      if (err) assert.fail(err);
      cb();
    });
  };

  var getMatchDoc = function(id, player1, player2, winner) {
    var doc = {_id: id, 'event': {
      type: 'Match', player1: player1, player2: player2, winner: winner}
    };
    return doc;
  };

  // Destroy any old test database before running the test.
  beforeEach(function(done) {
    PouchDB.destroy('testdb', function(err, info) {
      db = new PouchDB('testdb');
      db = require('../shared/db')(db);
      resolveChanges = require('../resolve-changes')(db);
      db.initializeIfNecessary(done);
    });
  });

  // Clean up after all tests are run.
  after(function(done) {
    console.log('Testing complete, deleting database');
    PouchDB.destroy('testdb', done);
  });

  // Tests the case where 2 events were recorded out of order so that when event
  // 2 arrives it's in the wrong order.
  it('Should resolve ranking when a doc arrives out of order', function(done) {
    var initialRanking;

    var onAddUsers = function() {
      db.getLatestDoc(function(err, latestDoc) {
        if (err) assert.fail(err);
        initialRanking = latestDoc.ranking;
        onGotInitialRanking();
      });
    };

    var onGotInitialRanking = function() {
      // We add a match where Gourdy beat Oliver at 1:00.
      var matchDoc = getMatchDoc(
          '2014-04-13T01:00:00', 'Gourdy', 'Oliver', 'Gourdy');
      matchDoc.ranking = dartEvents.applyMatch(initialRanking, matchDoc.event);
      assert.deepEqual(matchDoc.ranking,
        ['Gourdy', 'Sandy', 'Oliver', 'Alice', 'Nutter']);
      db.put(matchDoc, function(err) {
        if (err) assert.fail(err);
        onAddedLastMatch();
      });
    };

    var onAddedLastMatch = function() {
      // Now add a match that came before the final match at midnight
      var matchDoc = getMatchDoc(
          '2014-04-13T00:00:00', 'Sandy', 'Oliver', 'Sandy');
      matchDoc.ranking = dartEvents.applyMatch(initialRanking, matchDoc.event);
      assert.deepEqual(matchDoc.ranking,
        ['Sandy', 'Oliver', 'Gourdy', 'Alice', 'Nutter']);
      db.put(matchDoc, function(err) {
        if (err) assert.fail(err);
        onPriorEventAdded(matchDoc);
      });
    };

    var onPriorEventAdded = function(priorDoc) {
      var changeEvent = {doc: priorDoc};
      resolveChanges(changeEvent, function() {
        db.getLatestDoc(function(err, latestDoc) {
          if (err) assert.fail(err);
          assert.deepEqual(latestDoc.ranking,
            ['Sandy', 'Gourdy', 'Oliver', 'Alice', 'Nutter']);
          done();
        });
      });
    };

    addUsers(onAddUsers);
  });
});


