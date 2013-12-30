<html manifest="/manifest">
   <head>
      <script src="js/third_party/jquery-1.9.1.min.js"></script>
      <script src="js/third_party/pouchdb-nightly.min.js"></script>
      <script src="js/third_party/moment.min.js"></script>
      <script src="js/main.js"></script>
      <link rel="stylesheet" type="text/css" href="/css/main.css">
   </head>
   <body>
      <header>
      <div id="go-back">&lt;</div>
      <div id="event"></div>
      <div id="go-forward">&gt;</div>
      </header>
      <table id="rankings">
      </table>

      <img id="add-user-link" src="img/add_user.png">

      <input type="hidden" id="db-url" value="{{ dbUrl }}">

      {# This gets shown to record the outcome of a match. It's hidden
         until the user selects two rows in the rankings table. #}
      <div id="match" class="hidden">
         <h2>Select the winner:</h2>
         <input type="button" id="match-p1" class="match-button"><br>
         <input type="button" id="match-p2" class="match-button">
         <h2>- Or -</h2>
         <input type="button" value="Cancel" id="cancel-match" class="match-button">
      </div>
   </body>
</html>
