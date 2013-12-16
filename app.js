var express = require('express');
var http = require('http');
var path = require('path');
var swig = require('swig');
var PouchDB = require('pouchdb');

var app = express();
app.engine('swig', swig.renderFile);

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'swig');
app.set('views', __dirname + '/views');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());

// Set up an initial database if necessary.
var db = new PouchDB('http://localhost:5984/darts');
// Keys are YYYY-MM-DDTHH:MM:SS so to create an initial state document we create
// it with year, month, etc. as 0
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
  res.render('main');
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
