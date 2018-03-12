// Required modules and middleware for Express
const express = require('express');
const app = express();
const bodyparser = require('body-parser');
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
//SQL module and server config
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

/*Login for all users types
Expects: 
  civilID: varchar(12)
  Password: varchar(50)
Returns: either correct autherization or incorrect and reason
  "incorrect_user"
  OR "Auth success"
  OR "incorrect_password"
*/
app.post ('/login', function(req, res){
  var civilID = req.body.civilID;
  var password = req.body.password;
  sqlcon.query("SELECT * FROM USERS WHERE civilID = ?;",[civilID], function(err, data, fields){
    if (err) throw err;
    
    if (data[0] == null){
      res.json("incorrect_user");
    }
    else if (JSON.stringify(data[0].password) === JSON.stringify(password)){
     res.json({
        "fName":data[0].fName, 
        "lName":data[0].lName, 
        "userRole":data[0].userRole,
        "userID":data[0].userID});
      console.log("Auth success");
    }
    else { 
      res.json("incorrect_password");
    }
  })
});

/*Signup for guardians
Expects:
  civilID: varchar(12)
  userID: varchar(8)
  fName: varchar(25)
  mName: varchar(25)
  lName: varchar(25)
  password: varchar(50)
  email: varchar(50)
  phone: varchar(8)
  mobile: varchar(8)
Returns:
  "ID already exists"
  OR fName, lName, userRole, userID  
*/
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
            "userRole":userRole,
            "userID":userID});
        })
      })
    }
  })
});

/* Retrieves exam times for either guardian or teacher
Expects:
  userID: varchar(8)
  userRole: varchar(10)
Returns:
  If guardian: Object with each subject, subject name, its exam times and teacher name
  If teacher: Object with each subject and its grade level, class number, class name and exam times.
*/
app.post ('/examtimes', function(req, res){
  console.log('Exam times request');
  var userID = req.body.userID;
  var userRole = req.body.userRole;
  console.log(userID + '\n' + userRole);
    if (userRole==="Guardian"){
      sqlcon.query("SELECT * FROM ACTIVESTUDENT WHERE guardianID = ?;",[userID], function(err, data, fields){
        if (err) throw err;
        var studentID = data[0].studentID;
        sqlcon.query("SELECT \
        SUBJECTS.subjectName,SUBJECTS.examTime1,SUBJECTS.examTime2,SUBJECTS.examTime3,\
        SUBJECTS.examTime4,SUBJECTS.examTime5,SUBJECTS.examTime6,USERS.fName,USERS.mName,USERS.lName \
        FROM SUBJECTSTUDENT\
        INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID \
        INNER JOIN USERS ON SUBJECTS.teacherID = USERS.userID \
        WHERE (studentID = ? AND examTime6 >= NOW() AND YEAR(examTime1)>2017);",[studentID], function(err, data, fields){
          if (err) throw err;
          res.json(data);
        });       
      });
    }
    else if(userRole==="Teacher" || userRole==="Counsellor"){
      sqlcon.query("SELECT DISTINCT \
      CLASSES.gradeLevel,CLASSES.classNumber,SUBJECTS.subjectName,SUBJECTS.examTime1,SUBJECTS.examTime2,\
      SUBJECTS.examTime3,SUBJECTS.examTime4,SUBJECTS.examTime5,SUBJECTS.examTime6\
      FROM SUBJECTS \
      INNER JOIN CLASSES ON SUBJECTS.classID = CLASSES.classID \
      WHERE (teacherID = ? AND examTime6 >= NOW() AND YEAR(examTime1)>2017);",[userID], function(err, data, fields){
        if (err) throw err;
        res.json(data);
      });
    }
    else{
      console.log('UserRole error');
    }
});

/*Returns appointment information for a guardian or teacher
Expects:
  userID: varchar(8)
  userRole: varchar(10)
Returns:
  Full names of appointment targets and their appointment times.
*/
app.post ('/checkappointments', function(req, res){
  var userID = req.body.userID;
  var userRole = req.body.userRole;
  
  if (userRole==="Guardian"){
    sqlcon.query("SELECT DISTINCT\
    USERS.fName,USERS.mName,USERS.lName,APPOINTMENTS.meetingTime\
    FROM APPOINTMENTS \
    INNER JOIN USERS ON USERS.userID = APPOINTMENTS.teacherID\
    WHERE guardianID = ? AND meetingTime >= NOW()\
    ORDER BY meetingTime;",[userID],function(err, data, fields){
      if (err) throw err;
      res.json(data);
    });
  }
  else if (userRole==="Teacher" || userRole==="Counsellor"){
    console.log('Teachers appointments');
    sqlcon.query("SELECT DISTINCT \
    USERS.fName,USERS.mName,USERS.lName,APPOINTMENTS.meetingTime\
    FROM APPOINTMENTS \
    INNER JOIN USERS ON USERS.userID = APPOINTMENTS.guardianID\
    WHERE teacherID = ? AND meetingTime >= NOW()\
    ORDER BY meetingTime;",[userID], function(err, data, fields){
      if (err) throw err;
      console.log('Teachers appointments queried');
      res.json(data);
      console.log(data);
    });
  }
  else {
    console.log('UserRole error');
  }
});

/*Returns grade reports for guardian or counsellor
DO AFTER FIXING ACTIVE STUDENT!!!!
*/
app.post ('/gradereports', function(req, res){
  console.log('Grade report requested');
  console.log(req.body);
  var studentID;
  var userID = req.body.userID;
  var year = req.body.termYear;
  if (req.body.studentID){
    
  }
  //if this query returns data, user is guardian, otherwise counsellor.
  //MUST RETRIEVE ACTIVE STUDENT FROM LOCAL STORAGE!!!
  sqlcon.query("SELECT * FROM ACTIVESTUDENT WHERE guardianID = ?;",[userID], function(err, data, fields){
    if (err) throw err;
    if(data[0]){
      studentID = data[0].studentID;
    }
    else{
      studentID = req.body.studentID;
    }
    
    //Joins SUBJECTS, CLASSES AND SUBJECTSTUDENT to retrieve grades for a particular gradeLevel
    sqlcon.query("SELECT SUBJECTS.subjectName,CLASSES.gradeLevel,CLASSES.classNumber,USERS.fName,USERS.lName,\
    SUBJECTSTUDENT.grade1,SUBJECTSTUDENT.grade2,SUBJECTSTUDENT.grade3,SUBJECTSTUDENT.grade4,SUBJECTSTUDENT.grade5,\
    SUBJECTSTUDENT.grade6,SUBJECTSTUDENT.grade7,SUBJECTSTUDENT.grade8,SUBJECTSTUDENT.grade9,SUBJECTSTUDENT.grade10,\
    SUBJECTSTUDENT.grade11,SUBJECTSTUDENT.grade12,SUBJECTSTUDENT.grade13,SUBJECTSTUDENT.grade14,SUBJECTSTUDENT.grade15\
    FROM SUBJECTSTUDENT\
    INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
    INNER JOIN USERS ON SUBJECTS.teacherID = USERS.userID\
    INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID\
    WHERE (studentID = ? AND termYear = ?);",[studentID,year], function(err, data, fields){
      if (err) throw err;
      res.json(data);
      console.log(data);
    });       
  });
});

/* Returns the term years that a student was enrolled in the school
  Expects:
  DO AFTER ACTIVE STUDENT FIX!!!
*/
app.post ('/getyears', function(req, res){
  var userID = req.body.userID;
  var studentID = req.body.studentID;
  //if this query returns data, user is guardian, otherwise counsellor.
  sqlcon.query("SELECT * FROM ACTIVESTUDENT WHERE guardianID = ?;",[userID], function(err, data, fields){
    if (err) throw err;
    if(data[0]){
      studentID = data[0].studentID;
      console.log('Guardian');
    }
    else{
      studentID = req.body.studentID;
      console.log('Counsellor');
    }
    sqlcon.query("SELECT DISTINCT CLASSES.termYear\
    FROM SUBJECTSTUDENT\
    INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
    INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID\
    WHERE STUDENTID = ?\
    ORDER BY CLASSES.termYear DESC;",[studentID], function(err, data, fields){
      if (err) throw err;
      res.json(data);
    });
  });
});

/* Checks if a student ID actually exists in the database
Expects:
  studentID: varchar(8)
Returns:
  'valid_student'
  OR 'invalid_student'
*/
app.post ('/checkstudentid', function(req, res){
  var studentID = req.body.studentID;
  
  sqlcon.query("SELECT * FROM STUDENTS WHERE studentID = ?;",[studentID], function(err, data, fields){
    if (err) throw err;
    
    if(data[0]) {
      res.json('valid_student');
    }
    else {
      res.json('invalid_student');
    }
  });
});

/*Returns a student's subjects' information in the latest term
Expects:
  studentID: varchar(8)
Returns:
  Object containing each subject, subjectID and its teacher's full name and userID
*/
app.post ('/getstudentsubjects', function (req,res){
  var studentID = req.body.studentID;
  sqlcon.query("SELECT USERS.fName,USERS.mName,\
  USERS.lName, USERS.userID,SUBJECTS.subjectID,SUBJECTS.subjectName\
  FROM SUBJECTSTUDENT\
  INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
  INNER JOIN USERS ON USERS.userID = SUBJECTS.teacherID\
  INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID\
  INNER JOIN TERMS ON TERMS.termYear = CLASSES.termYear\
  WHERE STUDENTID = ? AND CLASSES.termYear = (SELECT MAX(termYear) FROM TERMS);",[studentID], function(err, data, fields){
    if (err) throw err;
    res.json(data);    
  });
});

/* Returns a list of all the students in a teacher's active subject.
Expects:
  subjectID: varchar(8)
Returns:
  An object containing the student name and ID of all students in 
  the subject, as well as their guardians names and userIDs
*/
app.post ('/getactivesubjectstudents', function (req,res){
  var subjectID = req.body.subjectID;
  sqlcon.query("SELECT\
  USERS.userID AS guardianID,USERS.fName AS guardianfName,\
  USERS.mName AS guardianmName,USERS.lName AS guardianlName,\
  STUDENTS.fName AS studentfName,STUDENTS.mName AS studentmName,\
  STUDENTS.lName AS studentlName\
  FROM SUBJECTSTUDENT\
  INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
  INNER JOIN STUDENTS ON STUDENTS.studentID = SUBJECTSTUDENT.studentID\
  INNER JOIN USERS ON USERS.userID = STUDENTS.guardianID\
  WHERE SUBJECTS.subjectID = ?;",[subjectID], function(err, data, fields){
    if (err) throw err;
    res.json(data);    
  });
});

/* Finds if there is an available time window for a teacher on a specific date.
Expects:
  teacherID: varchar(8)
  selectedDate: YYYY-MM-DD
Returns:
  A time if a free appointment time is available
  "unavailable" if appointments on that day are full
*/
app.post ('/getAvailableWindows', function (req,res){
  var teacherID = req.body.teacherID;
  var selectedDate = req.body.selectedDate;
  console.log(req.body);
  var day = new Date(selectedDate).getDay() + 1;
  sqlcon.query("SELECT COUNT(*) AS taken FROM APPOINTMENTS\
  WHERE teacherID = ? AND DATE(meetingTime) = ?;",[teacherID,selectedDate], function(err, data, fields){
    if (err) throw err;
    if (data[0].taken >= 2 || day > 4){
      res.json("unavailable");
    }
    else{
      switch (day){
        case 0:
          sqlcon.query("SELECT sunday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;",[teacherID], function(err, data, fields){
            if (err) throw err;
            res.json(data[0]);
          });
          break;
        case 1:
          sqlcon.query("SELECT monday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;",[teacherID], function(err, data, fields){
            if (err) throw err;
            res.json(data[0]);
          });
          break;
        case 2:
          sqlcon.query("SELECT tuesday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;",[teacherID], function(err, data, fields){
            if (err) throw err;
            res.json(data[0]);
          });
          break;
        case 3:
          sqlcon.query("SELECT wednesday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;",[teacherID], function(err, data, fields){
            if (err) throw err;
            res.json(data[0]);
          });
          break;
        case 4:
          sqlcon.query("SELECT thursday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;",[teacherID], function(err, data, fields){
            if (err) throw err;
            res.json(data[0]);
          });
          break;
      }      
    }  
  });
});

/* Creates an appointment between a teacher and guardian.
Expects:
  teacherID varchar(8)
  guardianID varchar(8)
  selectedDateTime: using SQL datetime formatting
Returns: 
  "success"
  OR "duplicate appointment"
*/

app.post('/bookAppointment', function (req,res){
  var teacherID = req.body.teacherID;
  var guardianID = req.body.guardianID;
  var selectedDateTime = req.body.selectedDateTime;
    
  console.log(req.body);
  
  sqlcon.query("INSERT INTO APPOINTMENTS VALUES(?,?,?)",[teacherID,guardianID,selectedDateTime], function(err, data, fields){
    if (err) {
        console.log("duplicate_appointment");
        res.json("duplicate_appointment");
    }
        
    else {
        console.log("success");
        res.json("success");
    }
  });
});

/*Retrieves a teacher's weekly time windows
Expects:
  teacherID: varchar(8)
Returns:
  object with the time windows of the five days of the week.
*/
app.post ('/getTimeWindows', function (req,res){
  var teacherID = req.body.teacherID;
    
  console.log(req.body);
    
  sqlcon.query("SELECT TIMEWINDOWS.sunday, TIMEWINDOWS.monday, TIMEWINDOWS.tuesday,\
  TIMEWINDOWS.wednesday, TIMEWINDOWS.thursday FROM TIMEWINDOWS WHERE teacherID = ?;",[teacherID], function(err, data, fields){
    if (err) {
		res.json("no_timeWindows");
		throw err;
	}

	res.json(data[0]);
    console.log(data[0]);
  });
});

/*Updates a teacher's weekly time windows
Expects:
  teacherID
  sunday, monday, tuesday, wednesday, thursday: HH:MM:SS
Returns:
  "success"
*/
app.post ('/setTimeWindows', function (req,res){
  var teacherID = req.body.teacherID;
  var sunday = req.body.sunday;
  var monday = req.body.monday;
  var tuesday = req.body.tuesday;
  var wednesday = req.body.wednesday;
  var thursday = req.body.thursday;
  
  console.log(req.body);

  sqlcon.query("UPDATE TIMEWINDOWS SET sunday = ?, monday = ?, tuesday = ?,wednesday = ?,\
  thursday = ? WHERE teacherID = ?",[sunday,monday,tuesday,wednesday,thursday,teacherID], function(err, data, fields){
    if (err) throw err;
    res.json("success");
  });
});

/*Returns appointment information for a guardian or teacher within 10 days from now
Expects:
  userID: varchar(8)
  userRole: varchar(10)
Returns:
  Full names of appointment targets and their appointment times.
*/

app.post ('/checknearappointments', function(req, res){
  var userID = req.body.userID;
  var userRole = req.body.userRole;
  
  if (userRole==="Guardian"){
    sqlcon.query("SELECT DISTINCT\
    USERS.fName,USERS.mName,USERS.lName,APPOINTMENTS.meetingTime\
    FROM APPOINTMENTS \
    INNER JOIN USERS ON USERS.userID = APPOINTMENTS.teacherID\
    WHERE guardianID = ? AND meetingTime >= NOW() AND meetingTime <= DATE_ADD(NOW(), INTERVAL 10 DAY)\
    ORDER BY meetingTime;",[userID],function(err, data, fields){
      if (err) throw err;
      if (data[0])
          res.json(data);
      else
          res.json('none');
    });
  }
  else if (userRole==="Teacher" || userRole==="Counsellor"){
    sqlcon.query("SELECT DISTINCT \
    USERS.fName,USERS.mName,USERS.lName,APPOINTMENTS.meetingTime\
    FROM APPOINTMENTS \
    INNER JOIN USERS ON USERS.userID = APPOINTMENTS.guardianID\
    WHERE teacherID = ? AND meetingTime >= NOW() AND meetingTime <= DATE_ADD(NOW(), INTERVAL 10 DAY)\
    ORDER BY meetingTime;",[userID], function(err, data, fields){
      if (err) throw err;
      if (data[0]) 
          res.json(data);
      else
          res.json('none');
    });
  }
  else {
    console.log('UserRole error');
  }
});

//Initializes server, must be at bottom of code
app.listen(3000, function(){
  console.log('Listening on port 3000');
});

