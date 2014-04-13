// This handles "events" like matches, new players being added, etc.
// This is DB agnostic - it takes JS Object/arrays and returns the same.

// Applies a match event, in evnt, to the ranking given by ranking.
exports.applyMatch = function(ranking, evnt) {
  console.assert(evnt.type === 'Match');
  var i1 = ranking.indexOf(evnt.player1);
  var i2 = ranking.indexOf(evnt.player2);
  console.assert(i1 >= 0);
  console.assert(i2 >= 0);
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
};

// Given ranking, an array of players in rank order, and evnt, an event like
// "Match" or "New Player", this applies the event to the ranking and returns
// teh new ranking.
exports.applyEvent = function(ranking, evnt) {
  if (evnt.type === 'New Player') {
    // Make a copy
    var res = ranking.slice(0);
    console.assert(evnt.player);
    res.push(evnt.player);
    return res;
  } else {
    return exports.applyMatch(ranking, evnt);
  }
};

// Returns true iff the arrays r1 and r2 are identical.
exports.rankingsEqual = function(r1, r2) {
  if (r1.length != r2.length) {
    return false;
  } else {
    for (var i = 0; i < r1.length; ++i) {
      if (r1[i] != r2[i]) {
        return false;
      }
    }
    return true;
  }
};
