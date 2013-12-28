<html manifest="/manifest">
   <head>
      <script src="js/third_party/jquery-1.9.1.min.js"></script>
      <script src="js/third_party/pouchdb-nightly.min.js"></script>
      <script src="js/third_party/moment.min.js"></script>
      <script src="js/main.js"></script>
      <style>
         #add-user-link:hover {
            cursor: pointer;
         }

         .hidden {
            display: none;
         }

         body {
            text-align: center;
         }

         #rankings {
            border: solid #000 1px;
            border-collapse: collapse;
            width: 80%;
            margin-left: auto;
            margin-right: auto;
            font-size: xx-large;
         }
            
         #rankings thead {
            font-variant: small-caps;
            font-weight: bold;
            border-bottom: double #000 5px;
         }

         #rankings tr {
            border-top: 2px solid black;
         }

         #rankings tr:nth-child(2n + 2) {
            background-color: #6B85BD;
         }

         #rankings tr.selected {
            background-color: yellow;
         }

         #rankings td {
            padding-top: 0.5em;
            padding-bottom: 0.5em;
            text-align: center;
         }

         #match {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: rgba(192, 192, 192, 0.8);
            font-size: xx-large;
         }

         .match-button {
            display: inline-block;
            font-size: xx-large;
            width: 20em;
            padding-top: 0.5em;
            padding-bottom: 0.5em;
         }
      </style>
   </head>
   <body>
      <div id="event"></div>
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
