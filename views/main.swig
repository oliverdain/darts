<html manifest="/manifest">
   <head>
      <script src="js/main.js"></script>
      <link rel="stylesheet" type="text/css" href="/css/main.css">
   </head>
   <body>
      <header>
         <ul class="button-group">
            <li><button class="button-group-button button-group-button-selected"
               id="current-btn">Current</button></li>
            <li><button class="button-group-button" id="hist-btn">History</button></li>
            <li><button class="button-group-button" id="manage-btn">Management</button></li>
         </ul>
         <div id="go-back" class="hidden">&lt;</div>
         <div id="event"></div>
         <div id="go-forward" class="hidden">&gt;</div>
      </header>
      <table id="rankings">
      </table>

      {# This gets shown when the user clicks the management button. #}
      <div id="management" class="hidden mode">
         <label for="new-user-name">New User:</label>
         <input type="text" id="new-player-name"></input>
         <input type="submit" value="Submit" id="add-player-btn"></input>
         <h2>- Or -</h2>
         <input type="button" value="Cancel" id="cancel-manage">
      </div>

      <input type="hidden" id="db-url" value="{{ dbUrl }}">

      {# This gets shown to record the outcome of a match. It's hidden
         until the user selects two rows in the rankings table. #}
      <div id="match" class="hidden mode">
         <h2>Select the winner:</h2>
         <input type="button" id="match-p1" class="match-button"><br>
         <input type="button" id="match-p2" class="match-button">
         <h2>- Or -</h2>
         <input type="button" value="Cancel" id="cancel-match" class="match-button">
      </div>
   </body>
</html>
