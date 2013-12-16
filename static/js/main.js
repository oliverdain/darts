// Database
var db = new PouchDB('darts');
db.replicate.to('http://localhost:3000/db/darts', {continuous: true});
db.replicate.from('http://localhost:3000/db/darts', {continuous: true});

var MAX_DOC_ID = '9999-99-99T99:99:99';

var getLatestDoc = function(cb) {
  db.allDocs({include_docs: true, endkey: MAX_DOC_ID,
    descending: true, limit: 1}, function(err, res) {
      if (err) {
        cb(err, null);
      } else {
        console.assert(res.rows.length == 1);
        cb(null, res.rows[0].doc);
      }
    });
}

var docIdForNow = function() {
  d = new Date();
  var iso = d.toISOString();
  return iso.replace(/\.\d{3}Z/, '');
};

var setupAddUser = function() {
  var $form = $('<div/>', {class: 'hidden'});
  var $name = $('<input/>', {type: 'text'});
  var $submit = $('<input/>', {type: 'submit', value: 'Submit'});
  var $cancel = $('<input/>', {type: 'button', value: 'Cancel'});

  $form.append($name, '<br>', $submit, $cancel);
  var $addBtn = $('#add-user-link');
  $addBtn.after($form);

  $addBtn.on('click', function() {
    $form.removeClass('hidden');
  });

  $cancel.on('click', function() {
    $form.addClass('hidden');
  });

  $submit.on('click', function() {
    console.log('Will insert %s: %s into the database', docIdForNow(), $name.val());
    getLatestDoc(function(err, doc) {
      if (err) {
        console.error('Error getting latest doc:', err);
      } else {
        var newDoc = {_id: docIdForNow(),
          'event': {type: 'New User'},
          ranking: doc.ranking
        };
        newDoc.ranking.push($name.val());
        db.put(newDoc, function(err) {
          if (err) {
            console.error('Error adding user!');
          } else {
            $form.addClass('hidden');
          }
        });
      }
    });
  });

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
