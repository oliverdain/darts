<html>
<head>
   <title>Log In</title>
</head>
<body>
   {% if flash %}
   <div class="error">
      {{flash}}
   </div>
   {% endif %}
   <form action="login_submit" method="post">
       <div>
           <label>Username:</label>
           <input type="text" name="username"/>
       </div>
       <div>
           <label>Password:</label>
           <input type="password" name="password"/>
       </div>
       <div>
           <input type="submit" value="Log In"/>
       </div>
   </form>
</body>
