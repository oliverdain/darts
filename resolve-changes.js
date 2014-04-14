var dartEvents = require('./shared/dart-events');
// Function that gets called on each database change. It's job is to ensure the
// database is consistent. For example, suppose we have two offline users, A and
// B that both record the results of different matches. Assume A's match happen
// before B's. If B gets online and sync's before A the data would be incorrect.
// However, when A gets online we'll get an update and we can then look at all
// documents that come *after* A and fix any problems.
module.exports = function(db) {
 return function(change, cb) {
    var doc = change.doc;
    var changes = {docs: []};
    db.allDocs({include_docs: true, startkey: doc._id},
        function(err, res) {
          if (err) {
            console.error('Unable to retrieve updated documents!', err);
            cb(err);
          } else {
            console.log('%d documents exist after the changed document %s',
              res.rows.length - 1, doc._id);
            if (res.rows.length <= 1) {
              return;
            }
            // Starting with the first document, apply the changes in the next
            // document. If the computed rankings match the observed, we're done.
            // If not, we need to fix that document.
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

            if (changes.docs.length > 0) {
              db.bulkDocs(changes, cb);
            } else {
              cb(null, null);
            }
          }
        });
 };
};
