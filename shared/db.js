// Database functionality. Oddly, this does not actually connect to the database
// as the front-end is using an embedded couchdb database and the backend is
// using a real CouchDB. Thus, this module exports a single function which takes
// a pouchDB object. Given that, it add a bunch of handy functions to the
// PouchDB object that are specific to this applicaton.

module.exports = function(db) {
  db.MAX_DOC_ID = '9999-99-99T99:99:99';
  db.MIN_DOC_ID = '0000-00-00T00:00:00';

  db.initializeIfNecessary = function(cb) {
    db.get(db.MIN_DOC_ID, function(err, doc) {
      if (err) {
        if (err.status == 404) {
          db.put({
            _id: db.MIN_DOC_ID,
            ranking: []
          }, function(err, response) {
            if (err) {
              console.error('Error creating initial document:', err);
              process.exit(1);
            } else {
              console.log('Creating initial document in database:', response);
              cb();
            }
          });
        } else {
          console.error('Error checking for starting doc:', err);
          process.exit(1);
        }
      } else {
        console.log('Database was already initialized');
        cb();
      }
    });
  };

  db.getLatestDoc = function(cb) {
    db.allDocs({include_docs: true, startkey: db.MAX_DOC_ID,
      descending: true, limit: 1}, function(err, res) {
        if (err) {
          cb(err, null);
        } else {
          if (res.rows.length === 0) {
            cb(null, null);
          } else {
            console.assert(res.rows.length == 1);
            cb(null, res.rows[0].doc);
          }
        }
      });
  };

  // Return the document that comes before docid
  db.getPrevDoc = function(docid, cb) {
    getSecondDoc({descending: true, endkey: docid}, cb);
  };

  // Return the document that comes after docid
  db.getNextDoc = function(docid, cb) {
    getSecondDoc({descending: false, startkey: docid}, cb);
  };

  // Used by both getNextDoc and getPrevDoc. The only difference is if we sort
  // the documents in ascending or descending order and if we're setting
  // startKey or endKey so we take opts containing these two options and then
  // merge in the common stuff.
  var getSecondDoc = function(opts, cb) {
    opts.include_docs = true;
    opts.limit = 2;
    db.allDocs(opts, function(err, res) {
        if (err) {
          cb(err, null);
        } else {
          if (res.rows.length <= 1) {
            console.error('getSecondDoc only got one result: ', res);
            cb(null, null);
          } else {
            cb(null, res.rows[1].doc);
          }
        }
      });
  };

  db.docIdForNow = function() {
    d = new Date();
    var iso = d.toISOString();
    return iso.replace(/\.\d{3}Z/, '');
  };

  return db;
};
