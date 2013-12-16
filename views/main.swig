<html manifest="/manifest">
   <head>
      <script src="js/third_party/jquery-1.9.1.min.js"></script>
      <script src="js/third_party/pouchdb-nightly.min.js"></script>
      <script src="js/main.js"></script>
      <style>
         #add-user-link:hover {
            cursor: pointer;
         }

         .hidden {
            display: none;
         }

         h1 {
            text-align: center;
         }

         #rankings {
            border: solid #000 1px;
            border-collapse: collapse;
            width: 80%;
            margin-left: auto;
            margin-right: auto;
         }
            
         #rankings thead {
            font-size: x-large;
            font-variant: small-caps;
            font-weight: bold;
            border-bottom: double #000 5px;
         }

         #rankings tr {
            border-top: 1px solid black;
         }

         #rankings tr:nth-child(2n + 2) {
            background-color: #6B85BD;
         }

         #rankings tr.selected {
            background-color: yellow;
         }

         #match {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
         }
      </style>
   </head>
   <body>
      <h1>Darts!</h1>
      <table id="rankings">
      </table>

      <img id="add-user-link" src="img/add_user.png">

      <div id="online-status">
      </div>
      <div id="match" class="hidden">
         <h2>Select the winner:</h2>
         <input type="radio" name="winner" value="1">
         <label for="player-1-winner" id="player-1-name"></label><br>
         <input type="radio" name="winner" value="2">
         <label for="player-1-winner" id="player-2-name"></label><br>
         <input type="button" value="Submit" id="submit-match">
         <input type="button" value="Cancel" id="cancel-match">
      </div>
   </body>
</html>
