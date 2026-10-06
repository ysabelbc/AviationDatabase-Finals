CREATE DATABASE PersonINFO
GO

USE PersonINFO
GO

-- ============================================
-- REFERENCE / LOOKUP TABLES
-- ============================================

CREATE TABLE Campus (
    CampusID    INT IDENTITY(1,1) PRIMARY KEY,
    GenID       INT NULL,
    CampusName  NVARCHAR(100) NOT NULL
);

CREATE TABLE Semester (
    SemID   INT IDENTITY(1,1) PRIMARY KEY,
    GenID   INT NULL,
    SemNo   NVARCHAR(20) NOT NULL
);

CREATE TABLE Program (
    ProgramID    INT IDENTITY(1,1) PRIMARY KEY,
    GenID        INT NULL,
    ProgramName  NVARCHAR(50) NOT NULL
);

CREATE TABLE Region (
    RegionID     INT IDENTITY(1,1) PRIMARY KEY,
    GenID        INT NULL,
    RegionName   NVARCHAR(50) NOT NULL
);

CREATE TABLE Religion (
    ReligionID   INT IDENTITY(1,1) PRIMARY KEY,
    GenID        INT NULL,
    ReligionName NVARCHAR(50) NOT NULL
);

CREATE TABLE AcademicYear (
    AcadYearID   INT IDENTITY(1,1) PRIMARY KEY,
    GenID        INT NULL,
    AcadYear     NVARCHAR(20) NOT NULL
);

CREATE TABLE Sex (
    SexID   INT IDENTITY(1,1) PRIMARY KEY,
    GenID   INT NULL,
    SexName NVARCHAR(10) NOT NULL
);

CREATE TABLE Civil_Status (
    CStatusID   INT IDENTITY(1,1) PRIMARY KEY,
    GenID       INT NULL,
    StatusName  NVARCHAR(30) NOT NULL
);

CREATE TABLE Residence (
    ResidenceID  INT IDENTITY(1,1) PRIMARY KEY,
    GenID        INT NULL,
    ResiName     NVARCHAR(50) NOT NULL
);

CREATE TABLE Marital (
    MaritalID     INT IDENTITY(1,1) PRIMARY KEY,
    FamID         INT NULL,
    MartialName   NVARCHAR(50) NOT NULL,
    is_active     BIT NOT NULL DEFAULT 1
);

CREATE TABLE Living_Arrangement (
    LivingID    INT IDENTITY(1,1) PRIMARY KEY,
    FamID       INT NULL,
    LivingName  NVARCHAR(50) NOT NULL,
    is_active   BIT NOT NULL DEFAULT 1
);

CREATE TABLE House_Income (
    HouseIncome  INT IDENTITY(1,1) PRIMARY KEY,
    FamID        INT NULL,
    IncomeName   NVARCHAR(50) NOT NULL,
    is_active    BIT NOT NULL DEFAULT 1
);

-- ============================================
-- MAIN RECORD TABLE
-- ============================================

CREATE TABLE General_Information (
    GenID           INT IDENTITY(1,1) PRIMARY KEY,
    CampusID        INT NOT NULL,
    SemID           INT NULL,
    ProgramID       INT NOT NULL,
    AcadYearID      INT NULL,
    StudentNo       NVARCHAR(20) NOT NULL,
    YearSec         NVARCHAR(20) NULL,
    LName           NVARCHAR(100) NOT NULL,
    FName           NVARCHAR(100) NOT NULL,
    MName           NVARCHAR(100) NULL,
    Nickname        NVARCHAR(100) NULL,
    Age             INT NULL,
    SexID           INT NULL,
    CivilStatusID   INT NULL,
    ReligionID      INT NULL,
    Birthday        DATE NULL,
    Birthplace      NVARCHAR(150) NULL,
    Citizenship     NVARCHAR(50) NULL,
    RegionID        INT NULL,
    LanguageSpoken  NVARCHAR(200) NULL,
    Indigenous      NVARCHAR(100) NULL,
    ResidenceID     INT NULL,
    PresentAdd      NVARCHAR(255) NULL,
    PermanentAdd    NVARCHAR(255) NULL,
    Contact         NVARCHAR(20) NULL,
    Email           NVARCHAR(100) NULL,
    Link            NVARCHAR(255) NULL,

    CONSTRAINT FK_GenInfo_Campus       FOREIGN KEY (CampusID)      REFERENCES Campus(CampusID),
    CONSTRAINT FK_GenInfo_Region       FOREIGN KEY (RegionID)      REFERENCES Region(RegionID),
    CONSTRAINT FK_GenInfo_Program      FOREIGN KEY (ProgramID)     REFERENCES Program(ProgramID),
    CONSTRAINT FK_GenInfo_Semester     FOREIGN KEY (SemID)         REFERENCES Semester(SemID),
    CONSTRAINT FK_GenInfo_AcadYear     FOREIGN KEY (AcadYearID)    REFERENCES AcademicYear(AcadYearID),
    CONSTRAINT FK_GenInfo_Religion     FOREIGN KEY (ReligionID)    REFERENCES Religion(ReligionID),
    CONSTRAINT FK_GenInfo_Sex          FOREIGN KEY (SexID)         REFERENCES Sex(SexID),
    CONSTRAINT FK_GenInfo_CivilStatus  FOREIGN KEY (CivilStatusID) REFERENCES Civil_Status(CStatusID),
    CONSTRAINT FK_GenInfo_Residence    FOREIGN KEY (ResidenceID)   REFERENCES Residence(ResidenceID)
);

-- ============================================
-- FAMILY BACKGROUND (Parents, Guardian, Spouse, Income)
-- ============================================

CREATE TABLE Family_Background (
    FamID           INT IDENTITY(1,1) PRIMARY KEY,
    GenID           INT NOT NULL,
    MaritalID       INT NULL,
    LivingID        INT NULL,
    LivingArrangementOther NVARCHAR(100) NULL,
    FName           NVARCHAR(150) NULL,
    FBirth          DATE NULL,
    Fcitizen        NVARCHAR(50) NULL,
    Foccupation     NVARCHAR(100) NULL,
    FeduAttainment  NVARCHAR(100) NULL,
    Fworkadd        NVARCHAR(255) NULL,
    Fcompleteadd    NVARCHAR(255) NULL,
    Fcontact        NVARCHAR(20) NULL,
    FatherDeceased  BIT NOT NULL DEFAULT 0,
    Mname           NVARCHAR(150) NULL,
    Mbirth          DATETIME NULL,
    Mcitizen        NVARCHAR(50) NULL,
    Moccupation     NVARCHAR(100) NULL,
    Meduattainment  NVARCHAR(100) NULL,
    Mworkadd        NVARCHAR(255) NULL,
    Mcompleteadd    NVARCHAR(255) NULL,
    Mcontact        NVARCHAR(20) NULL,
    MotherDeceased  BIT NOT NULL DEFAULT 0,
    LGName          NVARCHAR(150) NULL,
    LGRelationship  NVARCHAR(50) NULL,
    LGContact       NVARCHAR(20) NULL,
    LGAddress       NVARCHAR(255) NULL,
    NumofSibs       INT NULL,
    Birthorder      INT NULL,
    HouseIncomeID   INT NULL,
    HouseNo         NVARCHAR(50) NULL,
    Is4PsMember     BIT NOT NULL DEFAULT 0,
    DSWDHouseholdNo NVARCHAR(50) NULL,
    Finance         NVARCHAR(100) NULL,
    Spousename      NVARCHAR(150) NULL,
    Scontact        NVARCHAR(20) NULL,
    Skids           NVARCHAR(100) NULL,
    Ssoloparent     BIT NOT NULL DEFAULT 0,

    CONSTRAINT FK_FamBg_GenInfo      FOREIGN KEY (GenID)         REFERENCES General_Information(GenID),
    CONSTRAINT FK_FamBg_Marital      FOREIGN KEY (MaritalID)     REFERENCES Marital(MaritalID),
    CONSTRAINT FK_FamBg_Living       FOREIGN KEY (LivingID)      REFERENCES Living_Arrangement(LivingID),
    CONSTRAINT FK_FamBg_HouseIncome  FOREIGN KEY (HouseIncomeID) REFERENCES House_Income(HouseIncome)
);

-- ============================================
-- SIBLINGS (child of Family_Background)
-- ============================================

CREATE TABLE Siblings (
    SiblingID     INT IDENTITY(1,1) PRIMARY KEY,
    FamID         INT NOT NULL,
    SibName       NVARCHAR(150) NULL,
    SibAge        INT NULL,
    SibOccupation NVARCHAR(100) NULL,
    SibSC         NVARCHAR(150) NULL,
    SibContact    NVARCHAR(20) NULL,

    CONSTRAINT FK_Siblings_FamBg FOREIGN KEY (FamID) REFERENCES Family_Background(FamID)
);

-- ============================================
-- EDUCATIONAL BACKGROUND (School history, employment)
-- ============================================

CREATE TABLE Educational_Background (
    EducID        INT IDENTITY(1,1) PRIMARY KEY,
    GenID         INT NOT NULL,
    ElemName      NVARCHAR(150) NULL,
    ElemAdd       NVARCHAR(255) NULL,
    ElemYear      NVARCHAR(20) NULL,
    ElemTrack     NVARCHAR(100) NULL,
    ElemType      NVARCHAR(20) NULL,
    JHName        NVARCHAR(150) NULL,
    JHAdd         NVARCHAR(255) NULL,
    JHYear        NVARCHAR(20) NULL,
    JHTrack       NVARCHAR(100) NULL,
    JHType        NVARCHAR(20) NULL,
    SHName        NVARCHAR(150) NULL,
    SHAdd         NVARCHAR(255) NULL,
    SHYear        NVARCHAR(20) NULL,
    SHTrack       NVARCHAR(100) NULL,
    SHType        NVARCHAR(20) NULL,
    CollegeName   NVARCHAR(150) NULL,
    CollegeAdd    NVARCHAR(255) NULL,
    CollegeYear   NVARCHAR(20) NULL,
    CollegeTrack  NVARCHAR(100) NULL,
    CollegeType   NVARCHAR(20) NULL,
    Awards        NVARCHAR(255) NULL,
    Scholar       NVARCHAR(255) NULL,
    CEmployed     BIT NOT NULL DEFAULT 0,
    Employer      NVARCHAR(150) NULL,
    Since         NVARCHAR(20) NULL,

    CONSTRAINT FK_EducBg_GenInfo FOREIGN KEY (GenID) REFERENCES General_Information(GenID)
);

-- ============================================
-- EXTRACURRICULAR
-- ============================================

CREATE TABLE Extracurricular (
    ExtraID  INT IDENTITY(1,1) PRIMARY KEY,
    GenID    INT NOT NULL,
    SOAID    INT NULL,
    COAID    INT NULL,

    CONSTRAINT FK_Extracurr_GenInfo FOREIGN KEY (GenID) REFERENCES General_Information(GenID)
);

CREATE TABLE School_Organization (
    SOAID     INT IDENTITY(1,1) PRIMARY KEY,
    ExtraID   INT NOT NULL,
    SOrgName  NVARCHAR(150) NULL,
    SPosition NVARCHAR(100) NULL,
    SYear     NVARCHAR(20) NULL,

    CONSTRAINT FK_SchoolOrg_Extracurr FOREIGN KEY (ExtraID) REFERENCES Extracurricular(ExtraID)
);

CREATE TABLE Community_Organization (
    COAID     INT IDENTITY(1,1) PRIMARY KEY,
    ExtraID   INT NOT NULL,
    COrgName  NVARCHAR(150) NULL,
    CPosition NVARCHAR(100) NULL,
    CYear     NVARCHAR(20) NULL,

    CONSTRAINT FK_CommOrg_Extracurr FOREIGN KEY (ExtraID) REFERENCES Extracurricular(ExtraID)
);

-- ============================================
-- MEDICAL BACKGROUND
-- ============================================

CREATE TABLE Medical_Information (
    MedID         INT IDENTITY(1,1) PRIMARY KEY,
    GenID         INT NOT NULL,
    Height        DECIMAL(4,2) NULL,
    Weight        DECIMAL(5,2) NULL,
    PWD           BIT NOT NULL DEFAULT 0,
    Disability    NVARCHAR(100) NULL,
    PWDNo         NVARCHAR(50) NULL,
    Experience    NVARCHAR(255) NULL,
    Chronic       NVARCHAR(255) NULL,
    Therapy       BIT NOT NULL DEFAULT 0,
    [When]        NVARCHAR(50) NULL,
    MPCondition   NVARCHAR(255) NULL,
    TakingMed     NVARCHAR(255) NULL,

    CONSTRAINT FK_MedInfo_GenInfo FOREIGN KEY (GenID) REFERENCES General_Information(GenID)
);

-- ** TABLE 22 — Medication (child of Medical_Information) **
CREATE TABLE Medication (
    MedicationID   INT IDENTITY(1,1) PRIMARY KEY,
    MedID          INT NOT NULL,
    MedName        NVARCHAR(150) NULL,
    Dosage         NVARCHAR(100) NULL,
    Frequency      NVARCHAR(100) NULL,

    CONSTRAINT FK_Medication_MedInfo FOREIGN KEY (MedID) REFERENCES Medical_Information(MedID)
);

-- ============================================
-- OTHER INFORMATION
-- ============================================

CREATE TABLE Other_Information (
    OtherID     INT IDENTITY(1,1) PRIMARY KEY,
    GenID       INT NOT NULL,
    Sinterest   NVARCHAR(255) NULL,
    Skill       NVARCHAR(255) NULL,
    Hobbies     NVARCHAR(255) NULL,
    Ambition    NVARCHAR(255) NULL,
    Motto       NVARCHAR(255) NULL,
    DistinctPT  NVARCHAR(255) NULL,
    EResult     NVARCHAR(30) NULL,
    LatestGPA   DECIMAL(4,2) NULL,
    Signature   NVARCHAR(150) NULL,
    DateFiled   DATE NULL,

    CONSTRAINT FK_OtherInfo_GenInfo FOREIGN KEY (GenID) REFERENCES General_Information(GenID)
);

GO


--USE PersonINFO

--SELECT * FROM SYS.TABLES

--GO