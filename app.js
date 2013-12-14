var express = require('express');
var http = require('http');
var path = require('path');
var swig = require('swig');

var app = express();
app.engine('swig', swig.renderFile);

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'swig');
app.set('views', __dirname + '/views');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
  // Disable the swig cache so templates are always re-rendered
  swig.setDefaults({ cache: false });
}

var STATIC_PATH = path.join(__dirname, '/static');
app.use(require('less-middleware')({ src: '/css' }));
app.use(express.static(STATIC_PATH));
app.use(app.router);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

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
