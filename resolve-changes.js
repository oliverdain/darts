var dartEvents = require('./shared/dart-events');
var async = require('async');

// Function that returns a function that should be called on each database
// change. It's job is to ensure the database is consistent. For example,
// suppose we have two offline users, A and B that both record the results of
// different matches. Assume A's match happen before B's. If B gets online and
// sync's before A the data would be incorrect.  However, when A gets online
// we'll get an update and we can then look at all documents that come *after* A
// and fix any problems.
module.exports = function(db) {
 return function(change, userCb) {
    var doc = change.doc;
    var changes = {docs: []};

    // Does the following, in series:
    //
    // 1) Grabs the doc before the current one and ensures they are consistent
    // 2) Grabs all teh docs after the current one and ensures they are all
    // consistent.
    // 3) Writes any changes back to the DB.
    async.series([
        function(cb) {
          db.getPrevDoc(doc._id, function(err, prevDoc) {
            if (prevDoc === null) {
              cb();
              return;
            }
            if (err) {
              cb(err);
              return;
            }
            var correctRanking = dartEvents.applyEvent(
              prevDoc.ranking, doc.event);
            if (dartEvents.rankingsEqual(correctRanking, doc.ranking)) {
              console.log('%s is consistent with the previous doc, %s',
                doc._id, prevDoc._id);
              cb(null);
            } else {
              console.log('%s was not consistent with the previous doc, %s. ' +
                'Correct ranking: %j, received ranking: %j', doc._id,
                prevDoc._id, correctRanking, doc.ranking);
              doc.ranking = correctRanking.slice(0);
              changes.docs.push(doc);
              cb(null);
            }
          });
        },

        function(cb) {
          db.allDocs({include_docs: true, startkey: doc._id},
              function(err, res) {
                if (err) {
                  console.error('Unable to retrieve updated documents!', err);
                  cb(err);
                } else {
                  console.log('%d documents exist after changed document %s',
                    res.rows.length - 1, doc._id);
                  if (res.rows.length <= 1) {
                    if (cb) cb(null, null);
                    return;
                  }
                  // Starting with the first document, apply the changes in the
                  // next document. If the computed rankings match the observed,
                  // we're done.  If not, we need to fix that document.
                  var curRanking = res.rows[0].doc.ranking;
                  for (var i = 1; i < res.rows.length; ++i) {
                    console.log('Checking %s', res.rows[i].doc._id);
                    var nextDoc = res.rows[i].doc;
                    var newRanking =
                      dartEvents.applyEvent(curRanking, nextDoc['event']);
                    if (dartEvents.rankingsEqual(newRanking, nextDoc.ranking)) {
                      console.info('Change consistent.');
                      break;
                    } else {
                      console.info('Change requires update. ' +
                          'Computed ranking: %j. Old ranking: %j',
                          newRanking, nextDoc.ranking);
                      nextDoc.ranking = newRanking.slice(0);
                      changes.docs.push(nextDoc);
                    }
                    curRanking = newRanking;
                  }
                  cb(null);
                }
              });
        },

        function(cb) {
          if (changes.docs.length > 0) {
            console.log('Applying %d database changes', changes.docs.length);
            // Allow overwriting existing docs
            changes.new_edits = false;
            db.bulkDocs(changes, function(err, response) {
              if (err) {
                cb(err);
                return;
              }
              console.log('bulkDocs returned: %j', response);
              if (response.every(function(x) {return x.ok;})) {
                cb(null, null);
              } else {
                cb(new Error('There were some errors updating the db'));
              }
            });
          } else {
            cb(null, null);
          }
        }],

        function(err) {
          if (err) {
            console.error('Error fixing up database: ', err);
            if (userCb) userCb(err);
          } else {
            if (userCb) userCb();
          }
        });
 };
};
