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

         #rankings tr:nth-child(2n + 2) {
            background-color: #6B85BD;
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
   </body>
</html>
