var online = true;

var onOnline = function() {
  $('#online-status').text('Online!');
};

var onOffline = function() {
  $('#online-status').text('Offline');
};


var checkOnline = function() {
  $.get('/ping', function(data) {
    console.log('Online as of %s', data);
    if (!online) {
      onOnline();
    }
    online = true;
  }).fail(function(err) {
    console.log('No longer online: %s', err);
    if (online) {
      onOffline();
    }
    online = false;
  });
};

$(document).ready(function() {
  setInterval(checkOnline, 1000);
});
