// Database
var db;

var MAX_DOC_ID = '9999-99-99T99:99:99';

var getLatestDoc = function(cb) {
  db.allDocs({include_docs: true, endkey: MAX_DOC_ID,
    descending: true, limit: 1}, function(err, res) {
      if (err) {
        cb(err, null);
      } else {
        if (res.rows.length === 0) {
          return null;
        } else {
          console.assert(res.rows.length == 1);
          cb(null, res.rows[0].doc);
        }
      }
    });
}

var docIdForNow = function() {
  d = new Date();
  var iso = d.toISOString();
  return iso.replace(/\.\d{3}Z/, '');
};

var insertWinner = function(p1, p2, winner) {
  getLatestDoc(function(err, curDoc) {
    if (err) {
      console.error('Uable to get latest document. Match not recorded');
      return;
    }

    var ranking = curDoc.ranking.slice(0);
    var p1i = ranking.indexOf(p1);
    var p2i = ranking.indexOf(p2);
    if (p1i < p2i) {
      if (winner == p2) {
        var t = ranking[p1i];
        ranking[p1i] = ranking[p2i];
        ranking[p2i] = t;
      }
    } else {
      if (winner == p1) {
        var t = ranking[p1i];
        ranking[p1i] = ranking[p2i];
        ranking[p2i] = t;
      }
    }

    var newDoc = {
      _id: docIdForNow(),
      'event': {
        type: 'Match',
        player1: p1,
        player2: p2,
        winner: winner
      },
      ranking: ranking
    };
    db.put(newDoc, function(err) {
      if (err) {
        console.error('Error inserting new rankings:', err);
      } else {
        console.log('Rankings updated');
        rTable.updateRankings();
      }
    });
  });
}

var RankingsTable = function() {
  var $table = $('#rankings');
  var $head = $('<thead><tr><th>Rankings</th></tr></thead>');

  var getMatchOutcome = function(p1, p2) {
    $matchForm = $('#match');
    $('#player-1-name').text(p1);
    $('#player-2-name').text(p2);
    $submit = $('#submit-match');
    $submit.off('click');
    $submit.on('click', function() {
      console.log('Will store the winner in the database');
      console.log('The winner is: %s', $('input[name=winner]:checked').val());
      var winner = $('input[name=winner]:checked').val();
      if (winner == '1') {
        insertWinner(p1, p2, p1);
      } else {
        console.assert(winner == '2');
        insertWinner(p1, p2, p2);
      }
      $matchForm.addClass('hidden');
      $('.selected').removeClass('selected');
    });
    $cancel = $('#cancel-match');
    $cancel.off('click');
    $cancel.on('click', function() {
      $matchForm.addClass('hidden');
      $('.selected').removeClass('selected');
    });

    $matchForm.removeClass('hidden');
  };

  var onRowClick = function() {
    var $row = $(this);
    $row.toggleClass('selected');
    $selectedRows = $('.selected');
    if ($selectedRows.length > 1) {
      console.assert($selectedRows.length == 2);
      var p1 = $($selectedRows[0]).text();
      var p2 = $($selectedRows[1]).text();
      getMatchOutcome(p1, p2);
    }
  }

  var buildTable = function(ranking) {
    var $newTable = $('<table/>', {id: 'rankings'});
    $newTable.append($head);
    for (var i = 0; i < ranking.length; ++i) {
      $td = $('<td/>');
      $td.text(ranking[i]);
      $tr = $('<tr/>');
      $tr.click(onRowClick);
      $tr.append($td);
      $newTable.append($tr);
    }
    $table.replaceWith($newTable);
    $table = $newTable;
  };

  var updateFromLatestDoc = function() {
    getLatestDoc(function(err, doc) {
      if (err) {
        console.error('Unable to fetch latest document to build table');
      } else {
        if (doc) {
          buildTable(doc.ranking);
        }
      }
    });
  };

  updateFromLatestDoc();

  return {
    showRankings: buildTable,
    updateRankings: updateFromLatestDoc
  };
};

var setupAddUser = function(rankingsTable) {
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
    getLatestDoc(function(err, doc) {
      if (err) {
        console.error('Error getting latest doc:', err);
      } else {
        var newDoc = {_id: docIdForNow(),
          'event': {type: 'New Player', player: $name.val()},
          ranking: doc.ranking
        };
        newDoc.ranking.push($name.val());
        db.put(newDoc, function(err) {
          if (err) {
            console.error('Error adding user!');
          } else {
            $form.addClass('hidden');
            rankingsTable.showRankings(newDoc.ranking);
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

var rTable;
$(document).ready(function() {
  var dbUrl = $('#db-url').val();
  console.log('Will replicate to %s', dbUrl);
  var m = dbUrl.match(/http:\/\/([^;]+):([^@]+)@(.*)/);
  if (m) {
    db = new PouchDB('darts', {
      auth: {username: m[1], password: m[2]}
    });
    console.log('Set uname = %s, pass = %s', m[1], m[2]);
    dbUrl = 'http://' + m[3];
  } else {
    db = new PouchDB('darts');
  }

  db.replicate.to(dbUrl, {continuous: true});
  db.replicate.from(dbUrl, {continuous: true});

  onlineTracking();
  rTable = RankingsTable();
  setupAddUser(rTable);
});
