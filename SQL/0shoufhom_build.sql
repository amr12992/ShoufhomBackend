CREATE DATABASE shoufhomDB;
USE shoufhomDB;

CREATE TABLE TERMS(
  termYear int AUTO_INCREMENT,
  PRIMARY KEY (termYear)
);
ALTER TABLE TERMS AUTO_INCREMENT=2010;

CREATE TABLE USERS(
  civilID varchar(12),
  userID varchar(8) UNIQUE NOT NULL,
  fName varchar(25) NOT NULL,
  mName varchar(25) NOT NULL,
  lName varchar(25) NOT NULL,
  password varchar(50) NOT NULL,
  email varchar(50) NOT NULL,
  phone varchar(8),
  mobile varchar(8) NOT NULL,
  userRole varchar(10) NOT NULL,

  PRIMARY KEY (civilID)
);

CREATE TABLE CLASSES(
  gradeLevel int,
  classNumber int,
  termYear int,
  classID varchar(8) UNIQUE NOT NULL,

  PRIMARY KEY (gradeLevel, classNumber, termYear),
  FOREIGN KEY (termYear) REFERENCES TERMS(termYear)
);

CREATE TABLE STUDENTS(
  civilID varchar(12),
  studentID varchar(8) UNIQUE NOT NULL,
  fName varchar(25) NOT NULL,
  mName varchar(25) NOT NULL,
  lName varchar(25) NOT NULL,
  guardianID varchar(8) NOT NULL,

  PRIMARY KEY (civilID),
  FOREIGN KEY (guardianID) REFERENCES USERS(userID)
);

CREATE TABLE SUBJECTS(
  subjectName varchar(50),
  classID varchar(8),
  subjectID varchar(8) UNIQUE NOT NULL,
  subjectType varchar(50) NOT NULL,
  teacherID varchar(8) NOT NULL,
  examTime1 DATETIME,
  examTime2 DATETIME,
  examTime3 DATETIME,
  examTime4 DATETIME,
  examTime5 DATETIME,
  examTime6 DATETIME,

  PRIMARY KEY (subjectName, ClassID),
  FOREIGN KEY (teacherID) REFERENCES USERS(userID)
);

CREATE TABLE SUBJECTSTUDENT(
  subjectID varchar(8),
  studentID varchar(8),
  subjectStudentID varchar(8) UNIQUE NOT NULL,
  grade1 varchar(3),
  grade2 varchar(3),
  grade3 varchar(3),
  grade4 varchar(3),
  grade5 varchar(3),
  grade6 varchar(3),
  grade7 varchar(3),
  grade8 varchar(3),
  grade9 varchar(3),
  grade10 varchar(3),
  grade11 varchar(3),
  grade12 varchar(3),
  grade13 varchar(3),
  grade14 varchar(3),
  grade15 varchar(3),

  PRIMARY KEY (subjectID, studentID),
  FOREIGN KEY (subjectID) REFERENCES SUBJECTS(subjectID),
  FOREIGN KEY (studentID) REFERENCES STUDENTS(studentID)
);

CREATE TABLE ABSENCES(
  subjectStudentID varchar(8),
  absenceDate DATE,

  PRIMARY KEY (subjectStudentID),
  FOREIGN KEY (subjectStudentID) REFERENCES SUBJECTSTUDENT(subjectStudentID)
);

CREATE TABLE APPOINTMENTS(
  teacherID varchar(8),
  guardianID varchar(8),
  meetingTime DATETIME,
  
  PRIMARY KEY (teacherID,guardianID,meetingTime),
  FOREIGN KEY (teacherID) REFERENCES USERS(userID),
  FOREIGN KEY (guardianID) REFERENCES USERS(userID)
);

CREATE TABLE TIMEWINDOWS(
  teacherID varchar(8),
  sunday TIME,
  monday TIME,
  tuesday TIME,
  wednesday TIME,
  thursday TIME,
  PRIMARY KEY (teacherID),
  FOREIGN KEY (teacherID) REFERENCES USERS(userID)
);