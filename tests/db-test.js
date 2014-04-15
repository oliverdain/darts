var PouchDB = require('pouchdb');
var assert = require('assert');
var async = require('async');

describe('db', function() {
  var db;

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

  describe('#getLatestDoc', function() {
    it('Should return the latest doc.', function(done) {

      async.series([
        function(cb) {
          var docs = [
            {_id: '2014-04-14T00:00:00', data: 'first'},
            {_id: '2014-04-14T00:00:02', data: 'second'},
            {_id: '2014-04-14T04:00:02', data: 'third'}];
          db.bulkDocs({docs: docs}, cb);
        },

        function(cb) {
          var latest = db.getLatestDoc(function(err, latestDoc) {
            if (err) cb(err);
            assert.equal('2014-04-14T04:00:02', latestDoc._id);
            assert.equal('third', latestDoc.data);
            cb(null);
          });
        }],

        function(err) {
          if (err) assert.fail(err);
          done();
        });
    });
  });
});
