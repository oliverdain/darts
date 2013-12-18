var express = require('express');
var http = require('http');
var path = require('path');
var swig = require('swig');
var PouchDB = require('pouchdb');
var request = require('request');

var app = express();
app.engine('swig', swig.renderFile);

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'swig');
app.set('views', __dirname + '/views');

app.use(express.basicAuth(function(user, pass){
  return 'darts' == user && 'D4rts' == pass;
}));

// Proxy all requests to /darts to the local CouchDB instance.
//
// Have to do this before bodyparser or it messes things up.
// This proxies anything to /darts directly to the couchdb darts database.
var DATABASE_URL = 'http://localhost:5984';
app.use(function(req, res, next) {
  var proxyPath = req.originalUrl.match(/(^\/darts.*)$/);
  if(proxyPath){
    var dbUrl = DATABASE_URL + proxyPath[1];
    var requestOptions = {
      uri: dbUrl,
      method: req.method,
      headers: req.headers
    };
    // Now strip out the auth headers or couch will try to use them to
    // authenticate the user.
    delete requestOptions.headers.authorization;
      
    req.pipe(request(requestOptions)).pipe(res);
  } else {
    next();
  }
});

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());


// Set up an initial database if necessary.
var dbHost = process.env.DB || 'http://localhost:5984/darts';
console.info('Connecting to database at: %s', dbHost);
var db = new PouchDB(dbHost);
// Keys are YYYY-MM-DDTHH:MM:SS so to create an initial state document we
// create it with year, month, etc. as 0
var START_DOC_ID = '0000-00-00T00:00:00';
db.get(START_DOC_ID, function(err, doc) {
  if (err) {
    if (err.status == 404) {
      db.put({
        _id: START_DOC_ID,
        ranking: []
      }, function(err, response) {
        if (err) {
          console.error('Error creating initial document:', err);
          process.exit(1);
        } else {
          console.log('Creating initial document in database:', response);
        }
      });
    } else {
      console.error('Error checking for starting doc:', err);
      process.exit(1);
    }
  }
});

// Used by the resolveChanges below.
var applyEvent = function(ranking, evnt) {
  if (evnt.type === 'New Player') {
    // Make a copy
    var res = ranking.slice(0);
    console.assert(evnt.player);
    res.push(evnt.player);
    return res;
  } else {
    console.assert(evnt.type === 'Match');
    var i1 = ranking.indexOf(evnt.player1);
    var i2 = ranking.indexOf(evnt.player2);
    var winner = evnt.winner;
    var swap = false;
    if (i1 < i2) {
      if (evnt.winner === evnt.player2) {
        swap = true;
      }
    } else {
      if (evnt.winner === evnt.player1) {
        swap = true;
      }
    }
    if (swap) {
      var res = ranking.slice(0);
      var t = res[i1];
      res[i1] = res[i2];
      res[i2] = t;
      return res;
    } else {
      return ranking;
    }
  }
};

var rankingsEqual = function(r1, r2) {
  if (r1.length != r2.length) {
    return false;
  } else {
    for (var i = 0; i < r1.length; ++i) {
      if (r1[1] != r2[i]) {
        return false;
      }
    }
    return true;
  }
};

// Function that gets called on each database change. It's job is to ensure the
// database is consistent. For example, suppose we have two offline users, A and
// B that both record the results of different matches. Assume A's match happen
// before B's. If B gets online and sync's before A the data would be incorrect.
// However, when A gets online we'll get an update and we can then look at all
// documents that come *after* A and fix any problems.
var resolveChanges = function(change) {
  var doc = change.doc;
  db.allDocs({include_docs: true, startkey: doc._id},
      function(err, res) {
        if (err) {
          console.error('Unable to retrieve updated documents!', err);
        } else {
          console.log('%d documents exist after the changed document %s',
            res.rows.length - 1, doc._id);
          if (res.rows.length <= 1) {
            return;
          }
          var updates = [];
          // Starting with the first document, apply the changes in the next
          // document. If the computed rankings match the observed, we're done.
          // If not, we need to fix that document.
          var curRanking = res.rows[0].doc.ranking;
          for (var i = 1; i < res.rows.length; ++i) {
            var nextDoc = res.rows[i].doc;
            var newRanking = applyEvent(curRanking, nextDoc['event']);
            if (rankingsEqual(newRanking, nextDoc.ranking)) {
              console.info('Change consistent.');
              break;
            } else {
              console.info('Change requires update. Computed ranking: %j. Old ranking: %j',
                  newRanking, nextDoc.ranking);
              nextDoc.ranking = newRanking;
              updates.push(nextDoc);
            }
            curRanking = newRanking;
          }
        }
      });
};

// Listen to, and resolve, all database changes.
db.changes({
  include_docs: true,
  continuous: true,
  onChange: resolveChanges
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
  // Disable the swig cache so templates are always re-rendered
  swig.setDefaults({ cache: false });
}

var STATIC_PATH = path.join(__dirname, '/static');
app.use(express.static(STATIC_PATH));
app.use(app.router);

app.get('/', function(req, res) {
  res.render('main', {dbUrl: dbHost});
});

app.get('/ping', function(req, res) {
  var d = new Date();
  res.send(d.toString());
});

app.get('/manifest', function(req, res) {
  res.header("Content-Type", "text/cache-manifest");
  res.sendfile('manifest/manifest', function(err) {
    if (err) {
      console.error('Error sending manifest:', err);
    } else {
      console.log('Mainfest file sent.');
    }
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
