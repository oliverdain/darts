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

  var TEST_DB_NAME = 'testdb';

  // Destroy any old test database before running the test.
  beforeEach(function(done) {
    PouchDB.destroy(TEST_DB_NAME, function(err, info) {
      db = new PouchDB(TEST_DB_NAME);
      db = require('../shared/db')(db);
      resolveChanges = require('../resolve-changes')(db);
      db.initializeIfNecessary(done);
    });
  });

  // Clean up after all tests are run.
  after(function(done) {
    console.log('Testing complete, deleting database');
    PouchDB.destroy(TEST_DB_NAME, done);
  });

  // Tests the case where 2 events were recorded out of order so that when event
  // 2 arrives it's in the wrong order.
  it('Should resolve ranking when a doc arrives out of order', function(done) {
    var initialRanking;

    async.waterfall([
      addUsers,

      db.getLatestDoc,

      function(latestDoc, cb) {
        initialRanking = latestDoc.ranking;
        // We add a match where Gourdy beat Oliver at 1:00.
        var matchDoc = getMatchDoc(
            '2014-04-13T01:00:00', 'Gourdy', 'Oliver', 'Gourdy');
        matchDoc.ranking = dartEvents.applyMatch(
          initialRanking, matchDoc.event);
        assert.deepEqual(matchDoc.ranking,
          ['Gourdy', 'Sandy', 'Oliver', 'Alice', 'Nutter']);
        db.put(matchDoc, function(err) {
          if (err) cb(err);
          cb(null);
        });
      },

      function(cb) {
        // Now add a match that came before the final match at midnight
        var matchDoc = getMatchDoc(
            '2014-04-13T00:00:00', 'Sandy', 'Oliver', 'Sandy');
        matchDoc.ranking = dartEvents.applyMatch(
            initialRanking, matchDoc.event);
        assert.deepEqual(matchDoc.ranking,
          ['Sandy', 'Oliver', 'Gourdy', 'Alice', 'Nutter']);
        db.put(matchDoc, function(err) {
          if (err) cb(err);
          cb(null, matchDoc);
        });
      },

      function(priorDoc, cb) {
        var changeEvent = {doc: priorDoc};
        resolveChanges(changeEvent, function() {
          db.getLatestDoc(function(err, latestDoc) {
            if (err) cb(err);
            assert.deepEqual(latestDoc.ranking,
              ['Sandy', 'Gourdy', 'Oliver', 'Alice', 'Nutter']);
            cb();
          });
        });
      }],

      function(err) {
        if (err) assert.fail(err);
        done();
      });
  });

  // Similar to the above, but here the user missed a document and so calculated
  // the incorrect ranking, but the documents arrive in the correct order.
  it('Should resolve conflicts when a bad doc arrives', function(done) {
    var initialRanking;

    async.waterfall([
      addUsers,

      db.getLatestDoc,

      function(latestDoc, cb) {
        initialRanking = latestDoc.ranking;
        // We add a match where Gourdy beat Oliver at 1:00.
        var matchDoc = getMatchDoc(
            '2014-04-13T01:00:00', 'Gourdy', 'Oliver', 'Gourdy');
        matchDoc.ranking = dartEvents.applyMatch(
          initialRanking, matchDoc.event);
        assert.deepEqual(matchDoc.ranking,
          ['Gourdy', 'Sandy', 'Oliver', 'Alice', 'Nutter']);
        db.put(matchDoc, cb);
      },

      // Now add a later doc, but it's ranking is computed off the initial
      // ranking, not the prior match (simulating a user who missed a DB
      // update).
      function(result, cb) {
        var matchDoc = getMatchDoc(
            '2014-04-13T02:00:00', 'Sandy', 'Oliver', 'Sandy');
        matchDoc.ranking = dartEvents.applyMatch(
            initialRanking, matchDoc.event);
        assert.deepEqual(matchDoc.ranking,
            ['Sandy', 'Oliver', 'Gourdy', 'Alice', 'Nutter']);
        db.put(matchDoc, cb);
      },

      // Have to get the document from the database so the _rev information is
      // correct.
      function(res, cb) {
        db.getLatestDoc(cb);
      },
      
      function(lastDoc, cb) {
        var changeEvent = {doc: lastDoc};
        resolveChanges(changeEvent, function() {
          db.getLatestDoc(function(err, fixedDoc) {
            if (err) {
              cb(err);
            } else {
              console.log('Fixed doc: %j', fixedDoc);
              assert.deepEqual(fixedDoc.ranking,
                ['Gourdy', 'Sandy', 'Oliver', 'Alice', 'Nutter']);
              cb();
            }
         }); 
        });
      }],

      function(err) {
        if (err) assert.fail(err);
        done();
      });
  });
});


