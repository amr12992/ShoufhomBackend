// Required modules and middleware for Express
const express = require('express');
const app = express();
const bodyparser = require('body-parser');
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
	extended: true
}));
//SQL module and server config
const syncSql = require('sync-sql');
const mysql = require('mysql');
const syncSqlCon = {
	host: "127.0.0.1",
	port: "3306",
	user: "admin",
	password: "strongpass",
	database: 'shoufhomDB'
};
const sqlcon = mysql.createConnection({
	host: "127.0.0.1",
	port: "3306",
	user: "admin",
	password: "strongpass",
	database: 'shoufhomDB'
});

function splitDateTime(sqlDateTime) {
    var dateTime = String(sqlDateTime).substr(0, 19);
    dateTime = dateTime.replace(/T|Z/gi, ' ');
    dateTime = dateTime.split(' ');
    return dateTime;
}

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

//Get test case
app.get('/test', function(req, res) {
	console.log('test requested');
	res.end('GET working');
});


/*Login for all users types
Expects: 
  civilID: varchar(12)
  Password: varchar(50)
Returns: either correct autherization or incorrect and reason
  "incorrect_user"
  OR User first name, last name, user role and userID
  OR "incorrect_password"
*/
app.post('/login', function(req, res) {
	var civilID = req.body.civilID;
	var password = req.body.password;
	console.log(civilID + '\n' + password);
	sqlcon.query("SELECT * FROM USERS WHERE civilID = ?;", [civilID], function(err, data, fields) {
		if (err) throw err;

		if (data[0] == null) {
			res.json("incorrect_user");
		} else if (JSON.stringify(data[0].password) === JSON.stringify(password)) {
			res.json({
				"fName": data[0].fName,
				"lName": data[0].lName,
				"userRole": data[0].userRole,
				"userID": data[0].userID
			});
		} else {
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
app.post('/signup', function(req, res) {
	var civilID = req.body.civilID;
	var fName = req.body.fName;
	var mName = req.body.mName;
	var lName = req.body.lName;
	var password = req.body.password;
	var email = req.body.email;
	var phone = req.body.phone;
	var mobile = req.body.mobile;
	var userRole = 'Guardian';
	sqlcon.query("SELECT * FROM USERS WHERE civilID = ?;", [civilID], function(err, data, fields) {
		if (err) throw err;
		if (data[0]) {
			res.json("ID already exists");
		} else {
			sqlcon.query("SELECT MAX(userID) AS max_userID FROM USERS;", function(err, data, fields) {
				if (err) throw err;
				var userID = Number(data[0].max_userID) + 1;
				sqlcon.query("INSERT INTO USERS VALUES(?,?,?,?,?,?,?,?,?,?);", [civilID, userID, fName, mName, lName, password, email, phone, mobile, userRole], function(err, data, fields) {
					if (err) throw err;
					res.json({
						"fName": fName,
						"lName": lName,
						"userRole": userRole,
						"userID": userID
					});
				});
			});
		}
	});
});


/* Retrieves exam times for either guardian or teacher
Expects:
  userID: varchar(8)
  userRole: varchar(10)
	IF USER IS GUARDIAN THEN studentID: varchar(8)
Returns:
  If guardian: Object with each subject, subject name, its exam times and teacher name
  If teacher: Object with each subject and its grade level, class number, class name and exam times.
*/
app.post('/examTimes', function(req, res) {
	var userID = req.body.userID;
	var userRole = req.body.userRole;
	if (userRole === "Guardian") {
		var studentID = req.body.studentID;
		sqlcon.query("SELECT \
			SUBJECTS.subjectName,SUBJECTS.examTime1,SUBJECTS.examTime2,SUBJECTS.examTime3,\
			SUBJECTS.examTime4,SUBJECTS.examTime5,SUBJECTS.examTime6,USERS.fName,USERS.mName,USERS.lName \
			FROM SUBJECTSTUDENT\
			INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID \
			INNER JOIN USERS ON SUBJECTS.teacherID = USERS.userID \
			WHERE (studentID = ? AND examTime6 >= NOW() AND YEAR(examTime1)>2017);", [studentID], function(err, data, fields) {
			if (err) throw err;
			res.json(data);
		});
	} else if (userRole === "Teacher" || userRole === "Counsellor") {
		sqlcon.query("SELECT DISTINCT \
			CLASSES.gradeLevel,CLASSES.classNumber,SUBJECTS.subjectName,SUBJECTS.examTime1,SUBJECTS.examTime2,\
			SUBJECTS.examTime3,SUBJECTS.examTime4,SUBJECTS.examTime5,SUBJECTS.examTime6\
			FROM SUBJECTS \
			INNER JOIN CLASSES ON SUBJECTS.classID = CLASSES.classID \
			WHERE (teacherID = ? AND examTime6 >= NOW() AND YEAR(examTime1)>2017);", [userID], function(err, data, fields) {
			if (err) throw err;
			res.json(data);
		});
	} else {
		res.json('UserRole error');
	}
});


/*Returns appointment information for a guardian or teacher
Expects:
  userID: varchar(8)
  userRole: varchar(10)
Returns:
  Full names of appointment targets and their appointment times.
*/
app.post('/checkAppointments', function(req, res) {
	var userID = req.body.userID;
	var userRole = req.body.userRole;
	if (userRole === "Guardian") {
		sqlcon.query("SELECT DISTINCT\
    USERS.fName,USERS.mName,USERS.lName,APPOINTMENTS.meetingTime\
    FROM APPOINTMENTS \
    INNER JOIN USERS ON USERS.userID = APPOINTMENTS.teacherID\
    WHERE guardianID = ? AND meetingTime >= NOW()\
    ORDER BY meetingTime;", [userID], function(err, data, fields) {
			if (err) throw err;
			res.json(data);
		});
	} else if (userRole === "Teacher" || userRole === "Counsellor") {
		sqlcon.query("SELECT DISTINCT \
    USERS.fName,USERS.mName,USERS.lName,APPOINTMENTS.meetingTime\
    FROM APPOINTMENTS \
    INNER JOIN USERS ON USERS.userID = APPOINTMENTS.guardianID\
    WHERE teacherID = ? AND meetingTime >= NOW()\
    ORDER BY meetingTime;", [userID], function(err, data, fields) {
			if (err) throw err;
			res.json(data);
		});
	} else {
		res.json('UserRole error');
	}
});


/*Returns grade reports of a student
Expects:
	studentID: varchar(8)
	userID: varchar(8)
	ternYear: int
Returns:
	Every subject of the student with their grade level, class number, teacher and all the grades.
*/
app.post('/gradeReports', function(req, res) {
	var studentID = req.body.studentID;
	var userID = req.body.userID;
	var ternYear = req.body.termYear;
	//Joins SUBJECTS, CLASSES AND SUBJECTSTUDENT to retrieve grades for a particular gradeLevel
	sqlcon.query("SELECT SUBJECTS.subjectName,CLASSES.gradeLevel,CLASSES.classNumber,USERS.fName,USERS.lName,\
	SUBJECTSTUDENT.quarter1,SUBJECTSTUDENT.quarter2,SUBJECTSTUDENT.quarter3,SUBJECTSTUDENT.quarter4,SUBJECTSTUDENT.finalGrade\
	FROM SUBJECTSTUDENT\
	INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
	INNER JOIN USERS ON SUBJECTS.teacherID = USERS.userID\
	INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID\
	WHERE (studentID = ? AND termYear = ?);", [studentID, ternYear], function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});


/* Returns the term years that a student was enrolled in the school
Expects:
  studentID: varchar(8)
	userID: varchar(8)
Returns:
	Term years in which the student took classes.
*/
app.post('/getYears', function(req, res) {
	var userID = req.body.userID;
	var studentID = req.body.studentID;
	sqlcon.query("SELECT DISTINCT CLASSES.termYear\
	FROM SUBJECTSTUDENT\
	INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
	INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID\
	WHERE STUDENTID = ?\
	ORDER BY CLASSES.termYear DESC;", [studentID], function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});


/* Checks if a student ID actually exists in the database
Expects:
  studentID: varchar(8)
Returns:
  The student's information
  OR 'invalid_student'
*/
app.post('/checkStudentid', function(req, res) {
	var studentID = req.body.studentID;
    
    //console.log(studentID);

	sqlcon.query("SELECT * FROM STUDENTS WHERE studentID = ?;", [studentID], function(err, data, fields) {
		if (err) throw err;

		if (data[0]) {
			res.json(data[0]);
		} else {
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
app.post('/getStudentSubjects', function(req, res) {
	var studentID = req.body.studentID;
  //console.log(studentID);
  
	var response = {
    teachers: [],
    counsellors: []
  };
  
  sqlcon.query("SELECT USERS.fName,USERS.mName,\
  USERS.lName, USERS.userID,SUBJECTS.subjectID,SUBJECTS.subjectName\
  FROM SUBJECTSTUDENT\
  INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
  INNER JOIN USERS ON USERS.userID = SUBJECTS.teacherID\
  INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID\
  INNER JOIN TERMS ON TERMS.termYear = CLASSES.termYear\
  WHERE STUDENTID = ? AND CLASSES.termYear = (SELECT MAX(termYear) FROM TERMS);", [studentID], function(err, data, fields) {
		if (err) throw err;
		response.teachers = data;
    sqlcon.query("SELECT USERS.fName,USERS.mName,\
    USERS.lName, USERS.userID \
    FROM USERS \
    WHERE userRole = 'Counsellor';", function(err, data, fields) {
      if (err) throw err;
      response.counsellors = data;
      //console.log(response);
      
      res.json(response);
      
    });
	});
});


/* Returns a list of all the students in a teacher's active subject.
Expects:
  subjectID: varchar(8)
Returns:
  An object containing the student name and ID of all students in 
  the subject, as well as their guardians names and userIDs
*/
app.post('/getActiveSubjectStudents', function(req, res) {
	var subjectID = req.body.subjectID;
	sqlcon.query("SELECT\
  USERS.userID AS guardianID,USERS.fName AS guardianfName,\
  USERS.mName AS guardianmName,USERS.lName AS guardianlName,\
  STUDENTS.fName AS studentfName,STUDENTS.mName AS studentmName,\
  STUDENTS.lName AS studentlName\
  FROM SUBJECTSTUDENT\
  INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
  INNER JOIN STUDENTS ON STUDENTS.studentID = SUBJECTSTUDENT.studentID\
  INNER JOIN USERS ON USERS.civilID = STUDENTS.guardianCivilID\
  WHERE SUBJECTS.subjectID = ? AND STUDENTS.activeFlag = 1;", [subjectID], function(err, data, fields) {
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
app.post('/getAvailableWindows', function(req, res) {
	var teacherID = req.body.teacherID;
	var selectedDate = req.body.selectedDate;
	var day = new Date(selectedDate).getDay() + 1;
	sqlcon.query("SELECT COUNT(*) AS taken FROM APPOINTMENTS\
  WHERE teacherID = ? AND DATE(meetingTime) = ?;", [teacherID, selectedDate], function(err, data, fields) {
		if (err) throw err;
		if (data[0].taken >= 2 || day > 4) {
			res.json("unavailable");
		} else {
			switch (day) {
				case 0:
					sqlcon.query("SELECT sunday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;", [teacherID], function(err, data, fields) {
						if (err) throw err;
						res.json(data[0]);
					});
					break;
				case 1:
					sqlcon.query("SELECT monday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;", [teacherID], function(err, data, fields) {
						if (err) throw err;
						res.json(data[0]);
					});
					break;
				case 2:
					sqlcon.query("SELECT tuesday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;", [teacherID], function(err, data, fields) {
						if (err) throw err;
						res.json(data[0]);
					});
					break;
				case 3:
					sqlcon.query("SELECT wednesday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;", [teacherID], function(err, data, fields) {
						if (err) throw err;
						res.json(data[0]);
					});
					break;
				case 4:
					sqlcon.query("SELECT thursday AS availableTime FROM TIMEWINDOWS WHERE teacherID = ?;", [teacherID], function(err, data, fields) {
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

app.post('/bookAppointment', function(req, res) {
	var teacherID = req.body.teacherID;
	var guardianID = req.body.guardianID;
	var selectedDateTime = req.body.selectedDateTime;
	sqlcon.query("INSERT INTO APPOINTMENTS VALUES(?,?,?)", [teacherID, guardianID, selectedDateTime], function(err, data, fields) {
		if (err) {
			res.json("duplicate_appointment");
		} else {
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
app.post('/getTimeWindows', function(req, res) {
	var teacherID = req.body.teacherID;
	sqlcon.query("SELECT TIMEWINDOWS.sunday, TIMEWINDOWS.monday, TIMEWINDOWS.tuesday,\
  TIMEWINDOWS.wednesday, TIMEWINDOWS.thursday FROM TIMEWINDOWS WHERE teacherID = ?;", [teacherID], function(err, data, fields) {
		if (err) {
			res.json("no_timeWindows");
			throw err;
		}
		res.json(data[0]);
	});
});


/*Updates a teacher's weekly time windows
Expects:
  teacherID
  sunday, monday, tuesday, wednesday, thursday: HH:MM:SS
Returns:
  "success"
*/
app.post('/setTimeWindows', function(req, res) {
	var teacherID = req.body.teacherID;
	var sunday = req.body.sunday;
	var monday = req.body.monday;
	var tuesday = req.body.tuesday;
	var wednesday = req.body.wednesday;
	var thursday = req.body.thursday;
	sqlcon.query("UPDATE TIMEWINDOWS SET sunday = ?, monday = ?, tuesday = ?,wednesday = ?,\
  thursday = ? WHERE teacherID = ?", [sunday, monday, tuesday, wednesday, thursday, teacherID], function(err, data, fields) {
		if (err) throw err;
		res.json("success");
	});
});


/*Returns appointment information for a guardian or teacher within 10 days from now
Expects:
  userID: varchar(8)
  interval: int
Returns:
  Full names of appointment targets and their appointment times.
*/
app.post('/checkAppointmentsWithin', function(req, res) {
	var userID = req.body.userID;
	var interval = req.body.interval
	sqlcon.query("SELECT DISTINCT\
	TEACHERS.fName AS tfName,TEACHERS.mName AS tmName,TEACHERS.lName AS tlName,\
	GUARDIANS.fName AS gfName,GUARDIANS.mName AS gmName,GUARDIANS.lName AS glName,\
	APPOINTMENTS.meetingTime\
	FROM APPOINTMENTS \
	INNER JOIN USERS AS TEACHERS ON TEACHERS.userID = APPOINTMENTS.teacherID\
	INNER JOIN USERS AS GUARDIANS ON GUARDIANS.userID = APPOINTMENTS.guardianID\
	WHERE (guardianID = ? OR teacherID = ?) AND meetingTime >= NOW()\
	AND meetingTime <= DATE_ADD(NOW(), INTERVAL ? DAY)\
	ORDER BY meetingTime;", [userID, userID, interval], function(err, data, fields) {
		if (err) throw err;
		if (data[0]) res.json(data);
		else res.json('none');
	});
});


/* Retrieves information for all of a guardian's students
Expects:
	userID: varchar(8)
Returns:
	A list of students with their full name and studentID
*/
app.post('/getGuardianStudents', function(req, res) {
	var userID = req.body.userID;
	sqlcon.query("SELECT STUDENTS.studentID, STUDENTS.fName, STUDENTS.mName, STUDENTS.lName \
	FROM STUDENTS \
	INNER JOIN USERS ON STUDENTS.guardianCivilID = USERS.civilID \
	WHERE USERS.userID = ? AND STUDENTS.activeFlag = 1;", [userID], function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});


/*Retrieves all of a teacher's current term subjects
Expects: 
	userID: varchar(8)
Returns:
	A list of all subjects with their grade level, class number and subject name.
*/
app.post('/getTeacherSubjects', function(req, res) {
	var userID = req.body.userID;
	sqlcon.query("SELECT CLASSES.gradeLevel, CLASSES.classNumber, SUBJECTS.subjectName, SUBJECTS.subjectID \
	FROM SUBJECTS \
	INNER JOIN USERS ON SUBJECTS.teacherID = USERS.userID \
    INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID \
    INNER JOIN TERMS ON CLASSES.termYear = TERMS.termYear \
	WHERE USERS.userID = ? AND TERMS.termYear = (SELECT MAX(termYear) FROM TERMS);", [userID], function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});

/*Retrieves a single subject
Expects: 
	subjectID: varchar(8)
Returns:
	The grade level, class number and subject name for the specified subjectID.
*/
app.post('/getSingleSubject', function(req, res) {
	var subjectID = req.body.subjectID;
	sqlcon.query("SELECT CLASSES.gradeLevel, CLASSES.classNumber, SUBJECTS.subjectName \
	FROM SUBJECTS \
    INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID \
    INNER JOIN TERMS ON CLASSES.termYear = TERMS.termYear \
	WHERE SUBJECTS.subjectID = ?;", [subjectID], function(err, data, fields) {
		if (err) throw err;
		res.json(data[0]);
	});
});

app.post('/getStudentsAbsences', function(req, res) {
	var subjectID = req.body.subjectID;
	var absenceDate = req.body.absenceDate;
	var response = {
		studentList: [],
		absentStudents: []
	};
	sqlcon.query("SELECT SUBJECTSTUDENT.subjectID, SUBJECTSTUDENT.subjectStudentID, STUDENTS.fName, STUDENTS.mName, STUDENTS.lName \
	FROM SUBJECTSTUDENT \
	LEFT JOIN ABSENCES ON SUBJECTSTUDENT.subjectStudentID = ABSENCES.subjectStudentID \
  INNER JOIN STUDENTS ON SUBJECTSTUDENT.studentID = STUDENTS.studentID\
	WHERE SUBJECTSTUDENT.subjectID = ?", [subjectID], function(err, data, fields) {
		if (err) throw err;
		response.studentList = data;
		sqlcon.query("SELECT SUBJECTSTUDENT.subjectID, SUBJECTSTUDENT.subjectStudentID, STUDENTS.fName, STUDENTS.mName, STUDENTS.lName \
		FROM SUBJECTSTUDENT \
		LEFT JOIN ABSENCES ON SUBJECTSTUDENT.subjectStudentID = ABSENCES.subjectStudentID \
		INNER JOIN STUDENTS ON SUBJECTSTUDENT.studentID = STUDENTS.studentID\
		WHERE SUBJECTSTUDENT.subjectID = ? AND ABSENCES.absenceDate = ?;", [subjectID, absenceDate], function(err, data, fields) {
			if (err) throw err;
			response.absentStudents = data;
			res.json(response);
			//console.log(response);
		});
	});
});

app.post('/submitAbsence', function(req, res) {
	var absenceDate = req.body.absenceDate;
	var subjectID = req.body.subjectID;
	var students = req.body.students;
	//console.log("submit absence");

	function modify(singleStudent) {
		//console.log(singleStudent.subjectStudentID + ': ' + singleStudent.isAbsent);
		sqlcon.query("DELETE FROM ABSENCES WHERE subjectStudentID = ? AND absenceDate = ?", [singleStudent.subjectStudentID, absenceDate], function(err, data, fields) {
			if (err) throw err;
			if (singleStudent.isAbsent == 'true')
				sqlcon.query("INSERT INTO ABSENCES VALUES (?,?)", [singleStudent.subjectStudentID, absenceDate], function(err, data, fields) {
					if (err) throw err;
					sqlcon.query("UPDATE STUDENTS SET absenceFlag=1 WHERE studentID = ?", [singleStudent.subjectStudentID], function(err, data, fields) {
						if (err) throw err;
					});
				});
		});
	}
	if (students)
		students.forEach(modify);
	res.json('success');
});


app.post('/studentFlags', function(req, res) {
	var guardianCivilID = req.body.guardianCivilID;
	var result;
	sqlcon.query("SELECT STUDENTS.fName, STUDENTS.mName, STUDENTS.lName, \
	STUDENTS.gradeFlag, STUDENTS.absenceFlag \
	FROM STUDENTS \
	INNER JOIN USERS ON USERS.userID = STUDENTS.guardianCivilID \
	WHERE STUDENTS.guardianCivilID = ? AND (STUDENTS.gradeFlag = 1 OR STUDENTS.absenceFlag = 1)", [guardianCivilID], function(err, data, fields) {
		if (err) throw err;
		result = data;
		sqlcon.query("UPDATE STUDENTS SET absenceFlag=0 WHERE guardianCivilID = ?", [guardianCivilID], function(err, data, fields) {
			if (err) throw err;
			sqlcon.query("UPDATE STUDENTS SET gradeFlag=0 WHERE guardianCivilID = ?", [guardianCivilID], function(err, data, fields) {
				if (err) throw err;
			});
		});
	});
	res.json(result);
});

app.post('/getStudentAbsences', function(req, res) {
	var studentID = req.body.studentID;
	sqlcon.query("SELECT SUBJECTS.subjectName, ABSENCES.absenceDate \
	FROM ABSENCES \
	INNER JOIN SUBJECTSTUDENT ON SUBJECTSTUDENT.subjectStudentID = ABSENCES.subjectStudentID \
	INNER JOIN SUBJECTS ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID \
	INNER JOIN CLASSES ON SUBJECTS.classID = CLASSES.classID \
	INNER JOIN TERMS on CLASSES.termYear = TERMS.termYear \
	WHERE SUBJECTSTUDENT.studentID = ? AND TERMS.termYear = (select MAX(termYear) FROM TERMS) \
		ORDER BY ABSENCES.absenceDate DESC", [studentID], function(err, data, fields) {
		if (err) throw err;
        if (data[0])
		    res.json(data);
        else
            res.json('none');
	});
});

app.post('/getSubjectGrades', function(req, res) {
	var subjectID = req.body.subjectID;
	//console.log('getSubjectGrades ' + subjectID);
	var studentArray = [];
	var gradeArray = [];

	var response = {
		studentArray: studentArray,
		gradeArray: gradeArray
	}
	sqlcon.query("SELECT SUBJECTSTUDENT.subjectStudentID, STUDENTS.fName, STUDENTS.mName, STUDENTS.lName, \
	SUBJECTSTUDENT.quarter1, SUBJECTSTUDENT.quarter2, SUBJECTSTUDENT.quarter3, SUBJECTSTUDENT.quarter4, SUBJECTSTUDENT.finalGrade \
	FROM SUBJECTSTUDENT \
	INNER JOIN SUBJECTS ON SUBJECTS.subjectID = SUBJECTSTUDENT.subjectID \
	INNER JOIN STUDENTS ON STUDENTS.studentID = SUBJECTSTUDENT.studentID \
	WHERE SUBJECTS.subjectID = ?", [subjectID], function(err, data, fields) {
		if (err) throw err;
		response.studentArray = data;
		response.gradeArray = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4', 'Final Grade'];
		res.json(response);
	});
});

app.post('/submitGrades', function(req, res) {
	var subjectID = req.body.subjectID;
	//console.log('submitGrades ' + subjectID);
	//console.log(req.body.studentArray[0]);
	var studentArray = req.body.studentArray;

	function updateGrades(singleStudent) {
			sqlcon.query("UPDATE SUBJECTSTUDENT \
			SET quarter1 = ?, quarter2 = ?, quarter3 = ?, quarter4 = ?, finalGrade = ? \
			WHERE subjectStudentID = ?", [singleStudent.quarter1, singleStudent.quarter2, singleStudent.quarter3, singleStudent.quarter4, singleStudent.finalGrade, singleStudent.subjectStudentID], function(err, data, fields) {
				if (err) throw err;
				console.log(singleStudent.subjectStudentID);
        sqlcon.query("SELECT STUDENTS.studentID FROM STUDENTS \
        INNER JOIN SUBJECTSTUDENT ON SUBJECTSTUDENT.studentID = STUDENTS.studentID \
        WHERE SUBJECTSTUDENT.subjectStudentID = ?",[singleStudent.subjectStudentID], function(err, data, fields){
          if (err) throw err;
          sqlcon.query("UPDATE STUDENTS SET gradeFlag = 1 WHERE studentID = ?",[data[0].studentID], function(err, data, fields){
            if (err) throw err;
          });
        });
			}); 
	}
	studentArray.forEach(updateGrades);
	res.json('success');
});


app.post('/getClasses', function(req, res) {
	sqlcon.query("SELECT * FROM CLASSES WHERE termYear = (SELECT MAX(termYear) FROM TERMS)", function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});

app.post('/getSubjectsOfClass', function(req, res) {
	var classID = req.body.classID;
	sqlcon.query("SELECT SUBJECTS.subjectName, SUBJECTS.classID, SUBJECTS.subjectID, SUBJECTS.subjectType,\
	USERS.fName, USERS.mName, USERS.lName, USERS.userID \
	FROM SUBJECTS \
	INNER JOIN USERS ON USERS.userID = SUBJECTS.teacherID \
	WHERE SUBJECTS.classID = ?",[classID] , function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});


app.post('/getSubjectExams', function(req, res) {
	var subjectID = req.body.subjectID;
	sqlcon.query("SELECT SUBJECTS.subjectID, SUBJECTS.examTime1, SUBJECTS.examTime2, SUBJECTS.examTime3, \
	SUBJECTS.examTime4, SUBJECTS.examTime5, SUBJECTS.examTime6 \
	FROM SUBJECTS \
	WHERE SUBJECTS.subjectID = ?",[subjectID] , function(err, data, fields) {
		if (err) throw err;
        var subjectExams = [];
        Object.keys(data[0]).forEach( function(key) {
            if (key != 'subjectID') {
                var dateString = data[0][key].toISOString();
                dateString = splitDateTime(dateString);
                var dateTime = {
                    subjectID: data[0].subjectID, 
                    date: dateString[0],
                    time: dateString[1],
                    exam: key
                }
                subjectExams.push(dateTime);
            }
        });
		res.json(subjectExams);
	});
});


app.post('/modifySubjectExams', function(req, res) {
	var subjectID = req.body.subjectID;
    var dateTime = req.body.dateTime;
    var exam = req.body.exam;
	sqlcon.query("UPDATE SUBJECTS \
	SET " + exam + " = ? \
	WHERE subjectID = ?",[dateTime, subjectID] , function(err, data, fields) {
		if (err) throw err;
	});
});


app.post('/addClass', function(req, res) {
	var gradeLevel = req.body.gradeLevel;
	var classNumber = req.body.classNumber;
	var termYear;
	var classID;
	sqlcon.query("SELECT * FROM CLASSES WHERE gradeLevel = ? AND classNumber = ?", [gradeLevel,classNumber], function(err, data, fields){
		if (err) throw err;
		if (data[0]) res.json("Class level and number already exist");
		else{
			sqlcon.query("SELECT MAX(termYear) AS termYear FROM TERMS", function(err, data, fields){
				if (err) throw err;
				termYear = data[0].termYear;
				sqlcon.query("SELECT MAX(classID) AS classID FROM CLASSES", function(err, data, fields){
					if (err) throw err;
					classID = data[0].classID;
					classID++;
					sqlcon.query("INSERT INTO CLASSES VALUES(?,?,?,?)",[gradeLevel, classNumber, termYear, classID], function(err, data, fields){
						if (err) throw err;
						res.json("success");
					});
				});
			});
		}
	});
});

app.post('/modifyClass', function(req, res) {
	var classID = req.body.classID;
	var gradeLevel = req.body.gradeLevel;
	var classNumber = req.body.classNumber;
	sqlcon.query("UPDATE CLASSES SET gradeLevel = ?, classNumber = ? WHERE classID = ?",[gradeLevel, classNumber, classID], function(err, data, fields){
		if (err) throw err;
		res.json("success");
	});
});

app.post('/deleteClass', function(req, res) {
	var classID = req.body.classID;
    console.log(classID);
	function deepDelete(subject) {
		console.log(subject.subjectID);
		sqlcon.query("DELETE FROM SUBJECTSTUDENT WHERE subjectID = ?", [subject.subjectID], function(err, data, fields){
			if (err) throw err;	
			sqlcon.query("DELETE FROM SUBJECTS WHERE subjectID = ?", [subject.subjectID], function(err, data, fields){
				if (err) throw err;	
				sqlcon.query("DELETE FROM CLASSES WHERE classID = ?", [classID], function(err, data, fields){
					if (err) throw err;	
				});
			});
		});
	}
	sqlcon.query("SELECT * FROM SUBJECTS WHERE classID = ?",[classID] , function(err, data, fields) {
		if (err) throw err;
		if (data[0])
		    data.forEach(deepDelete);
        else {
            sqlcon.query("DELETE FROM CLASSES WHERE classID = ?", [classID], function(err, data, fields){
				if (err) throw err;	
			});
        }
		res.json('success');
	});
});

app.post('/addSubject', function(req, res) {
	var classID = req.body.classID;
	var teacherID = req.body.teacherID;
	var subjectName = req.body.subjectName;
	var subjectType = req.body.subjectType;
	var subjectID;
	
	function addSubjectStudent(student) {
		sqlcon.query("SELECT MAX(subjectStudentID) AS subjectStudentID FROM SUBJECTSTUDENT", function(err, data, fields){
			var subjectStudentID = data[0].subjectStudentID;
			subjectStudentID++;
			console.log(classID);
			console.log(subjectID);
			console.log(student);
			console.log(subjectStudentID);
			syncSql.mysql(syncSqlCon, "INSERT INTO SUBJECTSTUDENT (subjectID, studentID, subjectStudentID) VALUES(?,?,?)", [subjectID, student.studentID, subjectStudentID]);
		});
	}
	sqlcon.query("SELECT * FROM SUBJECTS WHERE teacherID = ? AND subjectName = ?", [teacherID,subjectName], function(err, data, fields){
		if (err) throw err;
		if (data[0]) res.json("A subject with that name and teacher already exists");
		else {
			sqlcon.query("SELECT MAX(subjectID) AS subjectID FROM SUBJECTS", function(err, data, fields){
				if (err) throw err;
				subjectID = data[0].subjectID;
				subjectID++;
				sqlcon.query("INSERT INTO SUBJECTS VALUES(?,?,?,?,?,NULL,NULL,NULL,NULL,NULL,NULL)",[subjectName, classID, subjectID, subjectType,teacherID], function(err, data, fields){
					if (err) throw err;
					sqlcon.query("SELECT DISTINCT STUDENTS.studentID FROM STUDENTS \
					INNER JOIN SUBJECTSTUDENT ON SUBJECTSTUDENT.studentID = STUDENTS.studentID\
					INNER JOIN SUBJECTS ON SUBJECTS.subjectID = SUBJECTSTUDENT.subjectID\
					INNER JOIN CLASSES ON CLASSES.classID = SUBJECTS.classID\
					WHERE CLASSES.classID = ?",[classID], function(err, data, fields){
						if (err) throw err;
						if (data) data.forEach(addSubjectStudent);						
					});
				});
			});
		}
	});
});

app.post('/modifySubject', function(req, res) {
	var teacherID = req.body.teacherID;
	var subjectName = req.body.subjectName;
	var subjectType = req.body.subjectType;
	var subjectID = req.body.subjectID;
	sqlcon.query("UPDATE SUBJECTS SET teacherID = ?, subjectName = ?, subjectType =? WHERE subjectID = ?",[teacherID, subjectName, subjectType, subjectID], function(err, data, fields){
		if (err) throw err;
		res.json("success");
	});
});

app.post('/deleteSubject', function(req, res) {
	var subjectID = req.body.subjectID;
	sqlcon.query("DELETE FROM SUBJECTSTUDENT WHERE subjectID = ?", [subjectID], function(err, data, fields){
		if (err) throw err;	
		sqlcon.query("DELETE FROM SUBJECTS WHERE subjectID = ?", [subjectID], function(err, data, fields){
			if (err) throw err;
		});
	});
});

app.post('/getStudentsFromClass', function(req, res){
	var classID = req.body.classID;
	var subjectStudentID;
	sqlcon.query("SELECT DISTINCT STUDENTS.fName, STUDENTS.mName, STUDENTS.lName, STUDENTS.studentID \
                  FROM CLASSES \
                  INNER JOIN SUBJECTS ON CLASSES.classID = SUBJECTS.classID\
                  INNER JOIN SUBJECTSTUDENT ON SUBJECTSTUDENT.subjectID = SUBJECTS.subjectID\
                  INNER JOIN STUDENTS ON STUDENTS.studentID = SUBJECTSTUDENT.studentID \
                  WHERE CLASSES.classID = ?",[classID] , function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});

app.post('/addStudentToClass', function(req, res){
	var classID = req.body.classID;
	var studentID = req.body.studentID;
	var subjectStudentID;
    
	function addAll(subject) {
        console.log(subject);
		sqlcon.query("SELECT MAX(subjectStudentID) AS subjectStudentID FROM SUBJECTSTUDENT", function(err, data, fields){
			subjectStudentID = data[0].subjectStudentID;
			subjectStudentID++;
			syncSql.mysql(syncSqlCon, "INSERT INTO SUBJECTSTUDENT (subjectID, studentID, subjectStudentID) VALUES(?,?,?)", [subject.subjectID, studentID, subjectStudentID]);
		});
	}
    
	sqlcon.query("SELECT * FROM SUBJECTS WHERE classID = ?",[classID] , function(err, data, fields) {
		if (err) throw err;
		if (data) data.forEach(addAll);
		res.json('success');
	});
});

app.post('/deleteStudentFromClass', function(req, res){
	var classID = req.body.classID;
	var studentID = req.body.studentID;
	function deleteAll(subject) {
		console.log("working");
		console.log(subject.subjectID);
		sqlcon.query("DELETE FROM SUBJECTSTUDENT WHERE subjectID = ? AND studentID = ?", [subject.subjectID, studentID], function(err, data, fields){
			if (err) throw err;	
		});
	}
	sqlcon.query("SELECT * FROM SUBJECTS WHERE classID = ?",[classID] , function(err, data, fields) {
		if (err) throw err;
		console.log(data);
		if (data) data.forEach(deleteAll);
		res.json('success');
	});
});

app.post('/addNewStudent', function(req, res) {
	var civilID = req.body.civilID;
  var fName = req.body.fName;
  var mName = req.body.mName;
  var lName = req.body.lName;
  var guardianCivilID = req.body.guardianCivilID;

	sqlcon.query("SELECT * FROM STUDENTS WHERE civilID = ?",[civilID], function(err, data, fields) {
		if (err) throw err;
		if (data[0]) {
			res.json("Student civilID already exists");
		} else {
			sqlcon.query("SELECT MAX(studentID) AS maxStudentID FROM STUDENTS", function(err, data, fields) {
				if (err) throw err;
				var studentID = Number(data[0].maxStudentID) + 1;
				sqlcon.query("INSERT INTO STUDENTS VALUES(?,?,?,?,?,?,default,default,default);", [civilID,studentID,fName,mName,lName,guardianCivilID], function(err, data, fields) {
					if (err) throw err;
					res.json("success");
				});
			});
		}
	});
});

app.post('/editStudent', function(req, res) {
	var studentID = req.body.studentID;
	var civilID = req.body.civilID;
  var fName = req.body.fName;
  var mName = req.body.mName;
  var lName = req.body.lName;
  var guardianCivilID = req.body.guardianCivilID;
  var activeFlag = req.body.activeFlag;
    console.log(activeFlag);
	activeFlag = (activeFlag == 'true'? 1 : 0); 
	sqlcon.query("UPDATE STUDENTS SET civilID = ?, fName = ?, mName = ?, lName = ?, guardianCivilID = ?, activeFlag = ?\
	WHERE studentID = ?", [civilID, fName, mName, lName, guardianCivilID, activeFlag, studentID], function(err, data, fields) {
		if (err) throw err;
		res.json("success");
	});
});

app.post('/modifyUserRole', function(req, res) {
	var userID = req.body.userID;
	var userRole = req.body.userRole;

	switch(userRole) {
    case "Guardian":
			sqlcon.query("UPDATE USERS SET userRole = 'Guardian' WHERE userID = ?",[userID], function(err, data, fields) {
				if (err) throw err;
				res.json("success");
			});
			break;
    case "Teacher":
    	sqlcon.query("UPDATE USERS SET userRole = 'Teacher' WHERE userID = ?",[userID], function(err, data, fields) {
				if (err) throw err;
				res.json("success");
			});
    	break;
		case "Counsellor":
    	sqlcon.query("UPDATE USERS SET userRole = 'Counsellor' WHERE userID = ?",[userID], function(err, data, fields) {
				if (err) throw err;
				res.json("success");
			});
    	break;
    default:
    	res.json("Invalid userRole");
	}
});

app.post('/createNewTerm', function(req, res) {
	sqlcon.query("INSERT INTO TERMS VALUES (default)", function(err, data, fields) {
		if (err) throw err;
		res.json("success");
	});
});

app.post('/readTerms', function(req, res) {
	sqlcon.query("SELECT * FROM TERMS ORDER BY termYear DESC", function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});

app.post('/readStudents', function(req, res) {
	sqlcon.query("SELECT * FROM STUDENTS ORDER BY studentID", function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});

app.post('/readUsers', function(req, res) {
	sqlcon.query("SELECT civilID, userID, fName, mName, lName, userRole FROM USERS ORDER BY userID", function(err, data, fields) {
		if (err) throw err;
		res.json(data);
	});
});


//Initializes server, must be at bottom of code
app.listen(3000, function() {
    console.log('Server initialized')
	console.log('Listening on port 3000');
});