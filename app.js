// Required modules and middleware
const express = require('express');
const app = express();
const bodyparser = require('body-parser');
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
//SQL module and config
const mysql = require('mysql');
const sqlcon = mysql.createConnection({
  host: "127.0.0.1",
  port:"3306",
  user: "admin",
  password: "strongpass",
  database : 'shoufhomDB'
});


app.get ('/test', function(req, res){
  console.log('test requested');
  res.end('GET working');
});

app.post ('/login', function(req, res){
  //console.log(req.body.name);
  console.log('login request');
  var username = req.body.username;
  var password = req.body.password;
  sqlcon.query("SELECT * FROM USERS WHERE civilID = " + JSON.stringify(username) + ";", function(err, data, fields){
    if (err) throw err;
    
    if (data[0] == null){
      res.json("incorrect_user");
      console.log("Incorrect Username");
    }
    else if (JSON.stringify(data[0].password) === JSON.stringify(password)){
      
      res.json({
        "fName":data[0].fName, 
        "lName":data[0].lName, 
        "userRole":data[0].userRole});
      console.log("Auth success");
    }
    else { 
      console.log("Incorrect Password");
      res.json("incorrect_password");
    }
  })

  /*
  var testres = {
    "action":"success",
    "usertype":"type"
  };

  res.json("received");
  */
});

app.listen(3000, function(){
  console.log('listening on port 3000');
})
