require('./third_party/jquery-1.9.1.min');
var PouchDB = require('./third_party/pouchdb-2.1.0.min.js');
var moment = require('./third_party/moment.min');
var dartEvents = require('../shared/dart-events');

// Database
var db = new PouchDB('darts');
var db = require('../shared/db')(db);
var rTable;

var insertWinner = function(p1, p2, winner) {
  db.getLatestDoc(function(err, curDoc) {
    if (err) {
      console.error('Uable to get latest document. Match not recorded');
      return;
    }

    var newDoc = {
      _id: db.docIdForNow(),
      'event': {
        type: 'Match',
        player1: p1,
        player2: p2,
        winner: winner
      }
    };

    newDoc.ranking = dartEvents.applyMatch(
      curDoc.ranking, newDoc.event);

    db.put(newDoc, function(err) {
      if (err) {
        console.error('Error inserting new rankings:', err);
      } else {
        console.log('Rankings updated');
        rTable.updateFromLatestDoc();
      }
    });
  });
};

var ButtonGroup = function() {
  $btnGroupBtns = $('.button-group-button');
  var $curSelected = $('.button-group-button-selected');

  var $forwardBtn = $('#go-forward');
  var $backBtn = $('#go-back');

  // Handlers for button clicks
  var onHistStart = function() {
    console.log('onHistStart');
    $forwardBtn.removeClass('hidden');
    $backBtn.removeClass('hidden');
  };

  var onHistEnd = function() {
    console.log('onHistEnd');
    $forwardBtn.addClass('hidden');
    $backBtn.addClass('hidden');
  };

  var onManageStart = function() {
    console.log('onManageStart');
    $manage = $('#management');
    $manage.removeClass('hidden');
  };

  var onManageEnd = function() {
    console.log('onManageEnd');
    $manage = $('#management');
    $manage.addClass('hidden');

  };

  var onCurrentStart = function() {
    console.log('onCurrentStart');
    rTable.updateFromLatestDoc();

  };
  // end button click handlers

  // Map from button id to the function that handles that button getting
  // clicked.
  var startHandlers = {
    'hist-btn': onHistStart,
    'manage-btn': onManageStart,
    'current-btn': onCurrentStart
  };

  // Map from button id to the function that handles that button no longer being
  // the active button.
  var endHandlers = {
    'hist-btn': onHistEnd,
    'manage-btn': onManageEnd
  };

  $('.button-group-button').on('click', function(evnt) {
     var $clicked = $(evnt.currentTarget);
     $curSelected.removeClass('button-group-button-selected');
     $clicked.addClass('button-group-button-selected');
     var endId = $curSelected.get(0).id;
     if (endHandlers.hasOwnProperty(endId)) {
       var fn = endHandlers[endId];
       fn();
     }
     $curSelected = $clicked;
     var startId = $curSelected.get(0).id;
     if (startHandlers.hasOwnProperty(startId)) {
       var fn = startHandlers[startId];
       fn();
     }
  });
};

var RankingsTable = function() {
  var $table = $('#rankings');
  var $head = $('<thead><tr><th>Rankings</th></tr></thead>');
  // The id of the doc whose results are currently displayed
  var currentDoc = null;
  // If in history mode we can browse prior matches, but we can't record new
  // matches. When not in history mode, the rankings table always shows the
  // most recent rankings and updates when new matches are recorded.
  var historyMode = false;

  // The largest document in the database
  var lastDoc = db.MIN_DOC_ID;
  var firstDoc = db.MAX_DOC_ID;
  var $histCheck = $('#hist-check');
  var $forwardBtn = $('#go-forward');
  var $backBtn = $('#go-back');

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
    if ($histCheck.prop('checked')) {
      console.log('Row clicked in historical mode - ignoring');
      return;
    }
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

  var displayEvent = function(doc) {
    if (!doc || !doc.event) {
      $('#event').text('None');
    }
    var evnt = doc.event;
    var dt = moment.utc(doc._id, 'YYYY-MM-DDTHH:mm:ss').local();
    var dateStr = dt.format('MMMM D, YYYY h:mm:ss A');
    var $datePart = $('<div/>', {'class': 'event-date'}).text(dateStr);
    if (evnt.type === 'New Player') {
      var txt = evnt.player + ' joined';
    } else {
      console.assert(evnt.type === 'Match');
      var winner = evnt.winner;
      if (evnt.player1 === evnt.winner) {
        var other = evnt.player2;
      } else {
        var other = evnt.player1;
      }
      var txt = winner + ' beat ' + other;
    }
    $eventPart = $('<div/>', {'class': 'event-summary'}).text(txt);
    $('#event').empty().append($datePart, $eventPart);
  };

  var displayDoc = function(doc) {
    console.log('Updating table with %s', doc._id);
    currentDoc = doc._id;
    buildTable(doc.ranking);
    displayEvent(doc);
    updateNavBtns();
  };


  var navForward = function() {
    console.log('Moving forward');
    console.assert(currentDoc);
    if (currentDoc < lastDoc) {
      db.getNextDoc(currentDoc, function(err, doc) {
        if (err) {
          console.error('Error getting the next document:', err);
        } else {
          console.assert(doc && doc._id > currentDoc);
          displayDoc(doc);
        }
      });
    } else {
      console.log('User click forward, but we are already displaying ' +
          'the latest document. Ignoring');
    }
  };

  var navBack = function() {
    console.log('Moving backward');
    console.assert(currentDoc);
    if (currentDoc > firstDoc) {
      db.getPrevDoc(currentDoc, function(err, doc) {
        if (err) {
          console.error('Error getting the previous document:', err);
        } else {
          console.assert(doc && doc._id < currentDoc);
          displayDoc(doc);
        }
      });
    } else {
      console.log('User click back, but we are already displaying ' +
          'the earliest document. Ignoring');
    }

  };

  $forwardBtn.on('click', navForward);
  $backBtn.on('click', navBack);

  var enableBtn = function($btn) {
    $btn.addClass('btn-enabled');
    $btn.removeClass('btn-disabled');
  };

  var disableBtn = function($btn) {
    $btn.removeClass('btn-enabled');
    $btn.addClass('btn-disabled');
  };

  var updateNavBtns = function() {
    if (currentDoc && currentDoc < lastDoc) {
      enableBtn($forwardBtn);
    }
    if (currentDoc && currentDoc > firstDoc) {
      enableBtn($backBtn);
    }
    if (currentDoc && currentDoc === lastDoc) {
      disableBtn($forwardBtn);
    }
    if (currentDoc && currentDoc === firstDoc) {
      disableBtn($backBtn);
    }
  };


  var updateFromLatestDoc = function() {
    db.getLatestDoc(function(err, doc) {
      if (err) {
        console.error('Unable to fetch latest document to build table');
      } else {
        if (doc) {
          displayDoc(doc);
        }
      }
    });
  };

  // Called when a changed document is detected.
  var updateOnChanges = function(change) {
    var doc = change.doc;
    // The min doc is just a place holder.
    if (doc._id == db.MIN_DOC_ID) {
      return;
    }

    if (doc._id > lastDoc) {
      lastDoc = doc._id;
      updateNavBtns();
    }
    if (doc._id < firstDoc) {
      firstDoc = doc._id;
      updateNavBtns();
    }

    if (!$histCheck.prop('checked') && doc._id > currentDoc) {
      // If not in historical mode and we got a new doc, show it.
      updateFromLatestDoc();
    } else if (currentDoc && doc._id == currentDoc) {
      // Update the currently viewed doc if it has changed.
      displayDoc(doc);
    }
  };

  updateFromLatestDoc();

  // Note that when we first start up, the updateOnChanges method will be
  // called with every single document in the database. That allows us to
  // maintain the firstDoc and lastDoc values.
  db.changes({
    include_docs: true,
    continuous: true,
    onChange: updateOnChanges
  });

  return {
    showRankings: buildTable,
    updateFromLatestDoc: updateFromLatestDoc
  };
};

var setupManage = function() {
  var $addBtn = $('#add-player-btn');
  var $newPlayerName = $('#new-player-name');
  var $cancelBtn = $('#cancel-manage');


  $addBtn.on('click', function() {
    db.getLatestDoc(function(err, doc) {
      if (err) {
        console.error('Error getting latest doc:', err);
      } else {
        var newDoc = {_id: db.docIdForNow(),
          'event': {type: 'New Player', player: $newPlayerName.val()},
          ranking: doc.ranking
        };
        newDoc.ranking.push($newPlayerName.val());
        db.put(newDoc, function(err) {
          if (err) {
            console.error('Error adding user!');
          } else {
            $('#current-btn').get(0).click();
          }
        });
      }
    });
  });

  $cancelBtn.on('click', function() {
    $('#current-btn').get(0).click();
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
//
// 4) Continuous database replication with PouchDB doesn't handle network issues
//    quite right. If the network is fine, replication is great, but if the
//    network goes down, replicaton fails. That's not too bad because pouch will
//    call the "complete" callback (continous replications are only "complete"
//    when they fail). However, if you restart replication in that callback and
//    it still fails the complete callback isn't called again. We therefore need
//    to track when we are and are not connected and manually restart
//    replication whenever the network link comes back.
var connectionHandling = function() {
  var appCache = window.applicationCache;
  $appCache = $(appCache);
  var NUM_MILLIS_PER_SEC = 1000;
  var OFFLINE_RECHECK_TIME_MILLIS = 10 * NUM_MILLIS_PER_SEC;
  var ONLINE_RECHECK_TIME_MILLIS = 10 * 60 * NUM_MILLIS_PER_SEC;

  var replicationInProgress = true;

  var tryAppCacheUpdate = function() {
    appCache.update();
  };

  $appCache.on('checking', function() {
    console.log('Checking for an updated manifest');
  });

  $appCache.on('error', function(e) {
    console.error('Error updating the applicatin cache. ' +
      'Will try again in %d seconds',
      OFFLINE_RECHECK_TIME_MILLIS / NUM_MILLIS_PER_SEC);
    setTimeout(tryAppCacheUpdate, OFFLINE_RECHECK_TIME_MILLIS);
  });

  $appCache.on('noupdate', function() {
    console.log('Applicaton cache is up to date. No changes found.');
    setTimeout(tryAppCacheUpdate, ONLINE_RECHECK_TIME_MILLIS);
    // Restart the database replication process.
    if (!replicationInProgress) {
      startReplication();
    }
  });

  $appCache.on('updateready', function() {
    console.log('Updated application cache found. Reloading the page.');
    // No more handling here because we'll keep reloading until the noupdate
    // event fires.
    window.location.reload();
  });

  var replicationError = function() {
    console.log('Replication failed. Will retry.');
    replicationInProgress = false;
    setTimeout(tryAppCacheUpdate, OFFLINE_RECHECK_TIME_MILLIS);
  };

  var startReplication = function() {
    var dbUrl = location.protocol + '//' + location.hostname;
    if (location.port) {
     dbUrl = dbUrl + ':' + location.port;
    }
    dbUrl = dbUrl + '/darts';
    console.info('Will replicate to %s', dbUrl);
    db.replicate.to(dbUrl, {continuous: true});
    // for continuous replication, complete is called only when replication
    // fails.
    db.replicate.from(dbUrl, {continuous: true, complete: replicationError});
    replicationInProgress = true;
  };

  startReplication();
};

$(document).ready(function() {
  connectionHandling();
  var btnGroup = new ButtonGroup();
  rTable = RankingsTable();
  setupManage();
});
