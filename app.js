var express = require('express');
var http = require('http');
var path = require('path');
var swig = require('swig');
var PouchDB = require('pouchdb');
var request = require('request');
var lessMiddleware = require('less-middleware');
var flash = require('connect-flash');
var browserify = require('browserify-middleware');
var fs = require('fs');
var dartEvents = require('./shared/dart-events');
var async = require('async');

var app = express();
app.engine('swig', swig.renderFile);

// Set up an initial database if necessary.
var dbHost = process.env.DB || 'http://localhost:5984/darts2';
console.info('Connecting to database at: %s', dbHost);
var db = new PouchDB(dbHost);
db = require('./shared/db')(db);

// Walks the database and ensures that all events are consistent (e.g. matches
// recorded out of order have been fixed). It then registers a callback to be
// notified of any DB updates so it can ensure that consistency is maintained.
var ensureDBConsistent = function(ensureCb) {
  var resolveChanges = require('./resolve-changes')(db);
  var seqNumber;

  async.series([
      // Check for and fix inconsistent docs
      function(cb) {
        var curDoc = {_id: db.MIN_DOC_ID};

        async.doWhilst(
          // This is called repeatedly
          function(whileCb) {
            db.getNextDoc(curDoc._id, function(err, doc) {
              curDoc = doc;
              if (curDoc) {
                var change = {doc: curDoc};
                resolveChanges(change, whileCb);
              } else {
                // We're all done!
                whileCb();
              }
            });
          },

          // Until this returns false
          function() {
            return curDoc !== null;
          },

          // Called when all docs have been resolved.
          function(err) {
            if (err) {
              cb(err);
            } else {
              cb();
            }
          });

      },

      // Grab the current sequence number
      //
      // Note: there is a tiny race here as changes could happen to the DB
      // between the fixed applied by the above function and this being called
      // but since we haven't yet set up the DB proxy it would be pretty much
      // impossible for that to happen.
      function(cb) {
        db.info(function(err, info) {
          if (err) {
            cb(err);
            return;
          }
          seqNumber = info.update_seq;
          console.log('Current sequence number: %s', seqNumber);
          cb(null);
        });
      },

      // Register to be notified of changes that happen after that seq number.
      function(cb) {
        console.log('Watching for any changes after seq#: %d', seqNumber);
        db.changes({
          include_docs: true,
          continuous: true,
          onChange: resolveChanges,
          since: seqNumber
        });
        cb();
      }],

      function(err) {
        if (err) {
          console.error('Error making DB consistent:', err);
          process.exit(1);
        }
        ensureCb();
      });
};

var main = function() {
  app.set('port', process.env.PORT || 3000);
  app.set('view engine', 'swig');
  app.set('views', __dirname + '/views');

  // Proxy all requests to /db/darts2 to the local CouchDB instance. We also
  // proxy /db as the sync process talks to the "root" CouchDB a bit in addition
  // to the specific database.
  //
  // Have to do this before bodyparser or it messes things up.
  // This proxies anything to /darts2 directly to the couchdb darts2 database.
  var DATABASE_URL = 'http://localhost:5984';
  app.use(function(req, res, next) {
    var proxyPath = req.originalUrl.match(/^\/db(.*)$/);
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
  app.use(flash());
  app.use(express.cookieParser());
  app.use(express.cookieSession({secret: '!@HLSJ00184ljaoue0#'}));

  // development only
  if ('development' == app.get('env')) {
    app.use(express.errorHandler());
    // Disable the swig cache so templates are always re-rendered
    swig.setDefaults({ cache: false });
  }

  var STATIC_PATH = path.join(__dirname, '/static');
  app.use(express.static(STATIC_PATH));
  app.use(app.router);
  app.use(lessMiddleware({
          dest: '/css',
          src: '/less', 
          root: STATIC_PATH
      }));

  var requireAuth = function(req, res, next) {
    if (req.session && req.session.user) {
      next();
    } else if (req.path == '/manifest') {
      // Send a 404 if a user who isn't logged in request the manifest file.
      // That way they remove everything from their cache and can't use the app
      // any more (this also clears out older versions of the app that didn't
      // use cookie auth).
      console.log('User not logged in requested the manifest.');
      res.status(404).send('No manifest file until you log in');
    } else {
      console.log('User not logged in - redirecting to the login page');
      res.redirect('/login');
    }
  };

  // Browserify processes require() calls so we can build a single big JS file
  // to serve and re-use modules between node and the browser. But, we don't
  // want it to parse 3rd party modules for 2 reasons: first - for big libs like
  // jquery it's really slow, and 2nd some (like pouchdb) can be used in the
  // browser or in node so they do contain conditional requires which should be
  // ignored.
  var browserifyNoParse = fs.readdirSync('./js/third_party');
  for (var ti = 0; ti < browserifyNoParse.length; ++ti) {
    browserifyNoParse[ti] = './js/third_party/' + browserifyNoParse[ti];
  }
  console.log('browserify will not parse: %j', browserifyNoParse);
  app.get('/js/main.js', browserify('./js/main.js',
        {noParse: browserifyNoParse}));

  app.get('/login', function(req, res) {
    res.render('login', {flash: req.flash('error')});
  });

  app.post('/login_submit', function(req, res, next) {
    console.log('login_submit called');
    if (req.body.username == 'darts' && req.body.password == 'D4rts') {
      console.log('User logged in');
      req.session.user = 'darts';
      res.redirect('/');
    } else {
      console.log('User tried to log in with %s:%s. Back to login',
        req.body.username, req.body.password);
      req.flash('error', 'Incorrect username and/or password');
      res.redirect('login');
    }
  });

  app.get('*', requireAuth);

  app.get('/manifest', function(req, res) {
    res.header("Content-Type", "text/cache-manifest");
    res.sendfile(__dirname + '/manifest/manifest', function(err) {
      if (err) {
        console.error('Error sending manifest:', err);
      } else {
        console.log('Mainfest file sent.');
      }
    });
  });

  app.get('/', function(req, res) {
    res.render('main', {dbUrl: dbHost});
  });

  app.get('/ping', function(req, res) {
    var d = new Date();
    res.send(d.toString());
  });

  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });
};

// This is the entry point.
async.series([
    db.initializeIfNecessary,
    ensureDBConsistent,
    main],

    function(err) {
      if (err) {
        console.error('Error spinning up server: ', err);
        process.exit(1);
      }
      console.log('All done!');
    });
