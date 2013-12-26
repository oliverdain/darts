// Database
var db = new PouchDB('darts');

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
  // The id of the doc whose results are currently displayed
  var currentDoc = null;

  var afterMatchRecorded = function() {
    $matchForm.addClass('hidden');
    $('.selected').removeClass('selected');
  };

  var getMatchOutcome = function(p1, p2) {
    $matchForm = $('#match');
    $btnP1 = $('#match-p1');
    $btnP2 = $('#match-p2');
    $btnP1.val(p1);
    $btnP2.val(p2);

    $btnP1.off('click');
    $btnP1.on('click', function() {
      console.log('Winner is %s', p1);
      insertWinner(p1, p2, p1);
      afterMatchRecorded();
    });

    $btnP2.off('click');
    $btnP2.on('click', function() {
      console.log('Winner is %s', p2);
      insertWinner(p1, p2, p2);
      afterMatchRecorded();
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
          currentDoc = doc._id;
        }
      }
    });
  };

  // Called when a changed document is detected.
  var updateOnChanges = function(change) {
    var doc = change.doc;
    if (!currentDoc || doc._id >= currentDoc) {
      currentDoc = doc._id;
      console.log('Updating table with %s', doc._id);
      buildTable(doc.ranking);
    }
  };

  updateFromLatestDoc();

  db.changes({
    include_docs: true,
    continuous: true,
    onChange: updateOnChanges
  });

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

// This does several things:
//
// 1) When the manifest is updated the browser loads the new resources, but it
//    continues to use the old ones so to actually *use* new code after an
//    update it's necessary to hit reload twice. This detects that we've
//    downloaded an updated appcache and auto-reloads the page.
//
// 2) If we're running offline (we can tell because the last manifest fetch
//    failed) we schedule periodic re-checks of the manifest so we stay up to
//    date.
//
// 3) We schedule less frequent manifest checks so a page left open still
//    detects a new manifest.
var appCacheHandling = function() {
  var appCache = window.applicationCache;
  $appCache = $(appCache);

  $appCache.on('checking', function() {
    console.log('Checking for an updated manifest');
  });

  $appCache.on('error', function(e) {
    console.error('Error updating the applicatin cache: %j', e);
  });

  $appCache.on('noupdate', function() {
    console.log('Applicaton cache is up to date. No changes found.');
  });

  $appCache.on('updateready', function() {
    console.log('Updated application cache found. Reloading the page.');
    window.location.reload();
  });
};

var rTable;
$(document).ready(function() {
  var dbUrl = location.protocol + '//' + location.hostname;
  if (location.port) {
   dbUrl = dbUrl + ':' + location.port;
  }
  dbUrl = dbUrl + '/darts';
  console.info('Will replicate to %s', dbUrl);
  db.replicate.to(dbUrl, {continuous: true});
  db.replicate.from(dbUrl, {continuous: true});

  appCacheHandling();
  rTable = RankingsTable();
  setupAddUser(rTable);
});
