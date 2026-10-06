-- ============================================================
--  Pink Horizon Academy — LMS Tables
--  Run this ONCE in SSMS after 01_add_useraccount.sql
--
--  New tables:
--    Course          — subject master list
--    Section         — course assigned to a semester/room/time
--    Enrollment      — student enrolled in a section (many-to-many)
--    Grade           — grade per enrollment
--    StudentProfile  — extra profile data (picture path, bio)
-- ============================================================

USE PersonINFO;
GO

-- ============================================================
--  Course  (subject master list — admin manages this)
-- ============================================================
IF OBJECT_ID('dbo.Course','U') IS NOT NULL DROP TABLE dbo.Course;
GO
CREATE TABLE Course (
    CourseID    INT IDENTITY(1,1) PRIMARY KEY,
    CourseCode  NVARCHAR(20)  NOT NULL,
    CourseName  NVARCHAR(150) NOT NULL,
    Units       INT           NOT NULL DEFAULT 3,
    Description NVARCHAR(500) NULL,
    IsActive    BIT           NOT NULL DEFAULT 1,
    CONSTRAINT UQ_Course_Code UNIQUE (CourseCode)
);
GO

-- ============================================================
--  Section  (course + schedule + room, per semester/year)
-- ============================================================
IF OBJECT_ID('dbo.Section','U') IS NOT NULL DROP TABLE dbo.Section;
GO
CREATE TABLE Section (
    SectionID   INT IDENTITY(1,1) PRIMARY KEY,
    CourseID    INT           NOT NULL,
    SemID       INT           NULL,
    AcadYearID  INT           NULL,
    SectionCode NVARCHAR(20)  NULL,        -- e.g. "AIT3-2"
    Room        NVARCHAR(50)  NULL,
    Schedule    NVARCHAR(100) NULL,        -- e.g. "MWF 9:00-10:00"
    Instructor  NVARCHAR(150) NULL,
    IsActive    BIT           NOT NULL DEFAULT 1,
    CONSTRAINT FK_Section_Course    FOREIGN KEY (CourseID)    REFERENCES Course(CourseID),
    CONSTRAINT FK_Section_Sem       FOREIGN KEY (SemID)       REFERENCES Semester(SemID),
    CONSTRAINT FK_Section_AcadYear  FOREIGN KEY (AcadYearID)  REFERENCES AcademicYear(AcadYearID)
);
GO

-- ============================================================
--  Enrollment  (student ↔ section, many-to-many)
-- ============================================================
IF OBJECT_ID('dbo.Enrollment','U') IS NOT NULL DROP TABLE dbo.Enrollment;
GO
CREATE TABLE Enrollment (
    EnrollmentID INT IDENTITY(1,1) PRIMARY KEY,
    GenID        INT NOT NULL,
    SectionID    INT NOT NULL,
    EnrolledAt   DATETIME NOT NULL DEFAULT GETDATE(),
    Status       NVARCHAR(20) NOT NULL DEFAULT 'enrolled',  -- enrolled | dropped | completed
    CONSTRAINT FK_Enrollment_GenInfo  FOREIGN KEY (GenID)      REFERENCES General_Information(GenID),
    CONSTRAINT FK_Enrollment_Section  FOREIGN KEY (SectionID)  REFERENCES Section(SectionID),
    CONSTRAINT UQ_Enrollment          UNIQUE (GenID, SectionID)  -- no duplicate enrollment
);
GO

-- ============================================================
--  Grade  (one grade per enrollment)
-- ============================================================
IF OBJECT_ID('dbo.Grade','U') IS NOT NULL DROP TABLE dbo.Grade;
GO
CREATE TABLE Grade (
    GradeID      INT IDENTITY(1,1) PRIMARY KEY,
    EnrollmentID INT            NOT NULL,
    Midterm      DECIMAL(3,2)   NULL,   -- 1.00 – 5.00
    Finals       DECIMAL(3,2)   NULL,
    FinalGrade   DECIMAL(3,2)   NULL,   -- computed or manually set
    Remarks      NVARCHAR(20)   NULL,   -- PASSED / FAILED / INC
    GradedAt     DATETIME       NULL,
    CONSTRAINT FK_Grade_Enrollment FOREIGN KEY (EnrollmentID) REFERENCES Enrollment(EnrollmentID),
    CONSTRAINT UQ_Grade_Enrollment UNIQUE (EnrollmentID)
);
GO

-- ============================================================
--  StudentProfile  (extra learner data — picture, bio)
-- ============================================================
IF OBJECT_ID('dbo.StudentProfile','U') IS NOT NULL DROP TABLE dbo.StudentProfile;
GO
CREATE TABLE StudentProfile (
    ProfileID   INT IDENTITY(1,1) PRIMARY KEY,
    GenID       INT            NOT NULL,
    PicturePath NVARCHAR(500)  NULL,   -- relative path to uploaded file
    Bio         NVARCHAR(500)  NULL,
    UpdatedAt   DATETIME       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Profile_GenInfo FOREIGN KEY (GenID) REFERENCES General_Information(GenID),
    CONSTRAINT UQ_Profile_GenID   UNIQUE (GenID)
);
GO

-- ============================================================
--  Seed: default courses for the aviation programs
-- ============================================================
INSERT INTO Course (CourseCode, CourseName, Units, Description) VALUES
('GEC1',    'Understanding the Self',              3, 'General Education — Self development'),
('GEC2',    'Readings in Philippine History',      3, 'General Education — History'),
('GEC3',    'Science, Technology and Society',     3, 'General Education — STS'),
('PE1',     'Physical Fitness',                    2, 'Physical Education'),
('NSTP1',   'National Service Training Program 1', 3, 'NSTP — Civic welfare'),
('AT101',   'Air Navigation',                      3, 'Fundamentals of air navigation'),
('AT102',   'Meteorology',                         3, 'Aviation weather and atmosphere'),
('AE101',   'Aerodynamics I',                      3, 'Principles of flight'),
('AE102',   'Aircraft Structures',                 3, 'Airframe and structural components'),
('AMT101',  'Aircraft Systems',                    3, 'Powerplant and systems overview'),
('AMT102',  'Aircraft Maintenance Practices',      3, 'Maintenance procedures and safety'),
('AIT101',  'Introduction to Aviation IT',         3, 'IT applications in aviation'),
('AIT102',  'Database Systems',                    3, 'Relational databases for aviation'),
('AVL101',  'Logistics Fundamentals',              3, 'Supply chain in aviation'),
('AVT101',  'Tourism and Hospitality',             3, 'Aviation tourism basics');
GO

-- Quick check
SELECT * FROM Course;
GO
