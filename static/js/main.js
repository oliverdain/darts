// Database
var db = new PouchDB('darts');
db.replicate.to('http://localhost:3000/db/darts', {continuous: true});
db.replicate.from('http://localhost:3000/db/darts', {continuous: true});

var setupAddUser = function() {

};

// Online tracking - single funciton which sets up and runs the online tracking
// stuff.
var onlineTracking = function() {
  var online = true;

  var onOnline = function() {
    $('#online-status').text('Online!');
  };

  var onOffline = function() {
    $('#online-status').text('Offline');
  };


  var checkOnline = function() {
    $.get('/ping', function(data) {
      if (!online) {
        console.log('Online as of %s', data);
        onOnline();
      }
      online = true;
    }).fail(function(err) {
      if (online) {
        console.log('No longer online: %s', err);
        onOffline();
      }
      online = false;
    });
  };

  $('#online-status').text('Online!');
  setInterval(checkOnline, 10000);
};

$(document).ready(function() {
  onlineTracking();
  setupAddUser();
});
