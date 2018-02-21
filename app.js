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

//Get test case
app.get ('/test', function(req, res){ 
  console.log('test requested');
  res.end('GET working');
});

//Login for all users types
app.post ('/login', function(req, res){
  console.log('login request');
  var civilID = req.body.civilID;
  var password = req.body.password;
  sqlcon.query("SELECT * FROM USERS WHERE civilID = ?;",[civilID], function(err, data, fields){
    if (err) throw err;
    
    //Checks if username exists
    if (data[0] == null){
      res.json("incorrect_user");
      console.log("Incorrect civilID");
    }
    //Check if password matches
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
});

//Create new teacher or guardian
app.post ('/signup', function(req, res){
  console.log('Signup request');
  var civilID = req.body.civilID;
  var fName = req.body.fName;
  var mName = req.body.mName;
  var lName = req.body.lName;
  var password = req.body.password;
  var email = req.body.email;
  var phone = req.body.phone;
  var mobile = req.body.mobile;
  var userRole = 'Guardian';
  
  //Retrieves civilID from database to check if it already exists
  sqlcon.query("SELECT * FROM USERS WHERE civilID = ?;", [civilID], function(err, data, fields){
    if (err) throw err;
    
    //Tests if the username exists
    if (data[0]) {
      res.json("ID already exists");
    }
    
    else{
      //Retrieves highest userID and increments it by 1
      sqlcon.query("SELECT MAX(userID) AS max_userID FROM USERS;", function(err, data, fields){
        if (err) throw err;
        var userID = Number(data[0].max_userID)+1;
        
        //Creates a new user
        sqlcon.query("INSERT INTO USERS VALUES(?,?,?,?,?,?,?,?,?,?);", [civilID, userID, fName, mName, lName, password, email, phone, mobile, userRole], function(err, data, fields){
          if (err) throw err;      
          res.json({
            "fName":fName, 
            "lName":lName, 
            "userRole":userRole});
        })
      })
    }
  })
});

//Initializes server
app.listen(3000, function(){
  console.log('Listening on port 3000');
})
