-- ============================================================
--  05_stored_procedures.sql  —  PersonINFO
--  One stored procedure per server.js route.
--  Run in SSMS (database PersonINFO). Safe to re-run: CREATE OR ALTER.
--
--  Naming:  usp_<Thing>_<Action>
--  Rule:    the app NEVER touches a table directly; it only EXECs these.
-- ============================================================
USE PersonINFO;
GO

-- ------------------------------------------------------------
--  HEALTH  (GET /api/health)
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE usp_Health_Check
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DB_NAME() AS db, SUSER_SNAME() AS login;
END
GO

-- ------------------------------------------------------------
--  LOOKUPS  (GET /api/lookups)  - one proc, @Type picks the table
--  Returns columns: id, name
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE usp_Lookup_Get
    @Type NVARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    IF      @Type = 'campus'    SELECT CampusID  AS id, CampusName   AS name FROM Campus            ORDER BY CampusName;
    ELSE IF @Type = 'program'   SELECT ProgramID AS id, ProgramName  AS name FROM Program           ORDER BY ProgramName;
    ELSE IF @Type = 'semester'  SELECT SemID     AS id, SemNo        AS name FROM Semester          ORDER BY SemID;
    ELSE IF @Type = 'acadYear'  SELECT AcadYearID AS id, AcadYear    AS name FROM AcademicYear      ORDER BY AcadYear;
    ELSE IF @Type = 'region'    SELECT RegionID  AS id, RegionName   AS name FROM Region           ORDER BY RegionID;
    ELSE IF @Type = 'religion'  SELECT ReligionID AS id, ReligionName AS name FROM Religion         ORDER BY ReligionName;
    ELSE IF @Type = 'sex'       SELECT SexID     AS id, SexName      AS name FROM Sex               ORDER BY SexID;
    ELSE IF @Type = 'civil'     SELECT CStatusID AS id, StatusName   AS name FROM Civil_Status      ORDER BY CStatusID;
    ELSE IF @Type = 'residence' SELECT ResidenceID AS id, ResiName   AS name FROM Residence         ORDER BY ResiName;
    ELSE IF @Type = 'marital'   SELECT MaritalID AS id, MartialName  AS name FROM Marital           ORDER BY MaritalID;
    ELSE IF @Type = 'living'    SELECT LivingID  AS id, LivingName   AS name FROM Living_Arrangement ORDER BY LivingID;
    ELSE IF @Type = 'income'    SELECT HouseIncome AS id, IncomeName AS name FROM House_Income      ORDER BY HouseIncome;
    ELSE THROW 50002, 'Unknown lookup type.', 1;
END
GO

-- ------------------------------------------------------------
--  APPLY  (POST /api/apply)  - ALL inserts in ONE transaction
--  The bcrypt hash is made in Node and passed in as @PasswordHash.
--  @HasFamily / @HasEducation / @HasMedical / @HasOther = 1 when that
--  section of the form was filled in.
--  Returns one row: GenID, StudentNo
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE usp_Student_Apply
    -- General_Information
    @CampusID INT, @SemID INT = NULL, @ProgramID INT, @AcadYearID INT = NULL,
    @StudentNo NVARCHAR(20) = NULL, @YearSec NVARCHAR(20) = NULL,
    @LName NVARCHAR(100), @FName NVARCHAR(100), @MName NVARCHAR(100) = NULL,
    @Nickname NVARCHAR(100) = NULL, @Age INT = NULL, @SexID INT = NULL,
    @CivilStatusID INT = NULL, @ReligionID INT = NULL, @Birthday DATE = NULL,
    @Birthplace NVARCHAR(150) = NULL, @Citizenship NVARCHAR(50) = NULL,
    @RegionID INT = NULL, @LanguageSpoken NVARCHAR(200) = NULL,
    @Indigenous NVARCHAR(100) = NULL, @ResidenceID INT = NULL,
    @PresentAdd NVARCHAR(255) = NULL, @PermanentAdd NVARCHAR(255) = NULL,
    @Contact NVARCHAR(20) = NULL, @Email NVARCHAR(100) = NULL, @Link NVARCHAR(255) = NULL,
    -- Family_Background
    @HasFamily BIT = 0, @MaritalID INT = NULL, @LivingID INT = NULL,
    @FamFName NVARCHAR(150) = NULL, @Foccupation NVARCHAR(100) = NULL, @Fcontact NVARCHAR(20) = NULL,
    @MotherName NVARCHAR(150) = NULL, @Moccupation NVARCHAR(100) = NULL, @Mcontact NVARCHAR(20) = NULL,
    @NumofSibs INT = NULL, @Birthorder INT = NULL, @HouseIncomeID INT = NULL,
    @Is4PsMember BIT = 0, @Finance NVARCHAR(100) = NULL,
    -- Educational_Background
    @HasEducation BIT = 0,
    @ElemName NVARCHAR(150) = NULL, @ElemYear NVARCHAR(20) = NULL,
    @JHName NVARCHAR(150) = NULL, @JHYear NVARCHAR(20) = NULL,
    @SHName NVARCHAR(150) = NULL, @SHYear NVARCHAR(20) = NULL, @SHTrack NVARCHAR(100) = NULL,
    @Awards NVARCHAR(255) = NULL, @Scholar NVARCHAR(255) = NULL,
    -- Medical_Information
    @HasMedical BIT = 0, @Height DECIMAL(4,2) = NULL, @Weight DECIMAL(5,2) = NULL,
    @PWD BIT = 0, @Disability NVARCHAR(100) = NULL, @Chronic NVARCHAR(255) = NULL,
    -- Other_Information
    @HasOther BIT = 0, @Sinterest NVARCHAR(255) = NULL, @Skill NVARCHAR(255) = NULL,
    @Hobbies NVARCHAR(255) = NULL, @Ambition NVARCHAR(255) = NULL, @Motto NVARCHAR(255) = NULL,
    -- UserAccount
    @Username NVARCHAR(100), @PasswordHash NVARCHAR(255), @Role NVARCHAR(20) = 'student'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;   -- any error rolls the whole transaction back

    -- friendly duplicate check (Node maps error 50001 to HTTP 409)
    IF EXISTS (SELECT 1 FROM UserAccount WHERE Username = @Username)
        THROW 50001, 'That username is already taken.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1) parent row
        INSERT INTO General_Information
            (CampusID, SemID, ProgramID, AcadYearID, StudentNo, YearSec, LName, FName, MName,
             Nickname, Age, SexID, CivilStatusID, ReligionID, Birthday, Birthplace, Citizenship,
             RegionID, LanguageSpoken, Indigenous, ResidenceID, PresentAdd, PermanentAdd,
             Contact, Email, Link)
        VALUES
            (@CampusID, @SemID, @ProgramID, @AcadYearID, COALESCE(@StudentNo, 'PHA-TEMP'), @YearSec,
             @LName, @FName, @MName, @Nickname, @Age, @SexID, @CivilStatusID, @ReligionID,
             @Birthday, @Birthplace, @Citizenship, @RegionID, @LanguageSpoken, @Indigenous,
             @ResidenceID, @PresentAdd, @PermanentAdd, @Contact, @Email, @Link);

        DECLARE @GenID INT = SCOPE_IDENTITY();   -- the new student's ID, used by every child row

        -- real student number, e.g. PHA-2026-00007, when none was supplied
        DECLARE @FinalStudentNo NVARCHAR(20) =
            COALESCE(@StudentNo,
                     'PHA-' + CAST(YEAR(GETDATE()) AS VARCHAR(4)) + '-' +
                     RIGHT('00000' + CAST(@GenID AS VARCHAR(10)), 5));

        IF @StudentNo IS NULL
            UPDATE General_Information SET StudentNo = @FinalStudentNo WHERE GenID = @GenID;

        -- 2) children (only if that part of the form was filled)
        IF @HasFamily = 1
            INSERT INTO Family_Background
                (GenID, MaritalID, LivingID, FName, Foccupation, Fcontact,
                 Mname, Moccupation, Mcontact, NumofSibs, Birthorder, HouseIncomeID, Is4PsMember, Finance)
            VALUES
                (@GenID, @MaritalID, @LivingID, @FamFName, @Foccupation, @Fcontact,
                 @MotherName, @Moccupation, @Mcontact, @NumofSibs, @Birthorder, @HouseIncomeID, @Is4PsMember, @Finance);

        IF @HasEducation = 1
            INSERT INTO Educational_Background
                (GenID, ElemName, ElemYear, JHName, JHYear, SHName, SHYear, SHTrack, Awards, Scholar)
            VALUES
                (@GenID, @ElemName, @ElemYear, @JHName, @JHYear, @SHName, @SHYear, @SHTrack, @Awards, @Scholar);

        IF @HasMedical = 1
            INSERT INTO Medical_Information (GenID, Height, Weight, PWD, Disability, Chronic)
            VALUES (@GenID, @Height, @Weight, @PWD, @Disability, @Chronic);

        IF @HasOther = 1
            INSERT INTO Other_Information (GenID, Sinterest, Skill, Hobbies, Ambition, Motto, DateFiled)
            VALUES (@GenID, @Sinterest, @Skill, @Hobbies, @Ambition, @Motto, CAST(GETDATE() AS DATE));

        -- 3) login account
        INSERT INTO UserAccount (GenID, Username, PasswordHash, Role)
        VALUES (@GenID, @Username, @PasswordHash, @Role);

        COMMIT TRANSACTION;

        SELECT @GenID AS GenID, @FinalStudentNo AS StudentNo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;   -- re-raise the original error to Node
    END CATCH
END
GO

-- ------------------------------------------------------------
--  LOGIN  (POST /api/login)  - bcrypt compare happens in Node
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE usp_User_Login
    @Username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ua.UserID, ua.GenID, ua.Username, ua.PasswordHash, ua.Role,
           g.FName, g.LName, g.StudentNo
    FROM UserAccount ua
    INNER JOIN General_Information g ON g.GenID = ua.GenID
    WHERE ua.Username = @Username AND ua.IsActive = 1;
END
GO

-- ------------------------------------------------------------
--  LMS HOME  (GET /api/lms/home)
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE usp_Student_GetHome
    @GenID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT g.GenID, g.StudentNo, g.FName, g.MName, g.LName, g.YearSec, g.Email, g.Contact,
           p.ProgramName, c.CampusName, sm.SemNo, ay.AcadYear
    FROM General_Information g
    LEFT JOIN Program      p  ON p.ProgramID   = g.ProgramID
    LEFT JOIN Campus       c  ON c.CampusID    = g.CampusID
    LEFT JOIN Semester     sm ON sm.SemID      = g.SemID
    LEFT JOIN AcademicYear ay ON ay.AcadYearID = g.AcadYearID
    WHERE g.GenID = @GenID;
END
GO

-- ------------------------------------------------------------
--  STATS  (GET /api/stats/...)
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE usp_Stats_Summary
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        (SELECT COUNT(*) FROM General_Information)                           AS totalStudents,
        (SELECT COUNT(*) FROM Program)                                       AS totalPrograms,
        (SELECT COUNT(*) FROM Campus)                                        AS totalCampuses,
        (SELECT COUNT(*) FROM UserAccount)                                   AS totalAccounts,
        (SELECT COUNT(*) FROM Family_Background WHERE Is4PsMember = 1)       AS fourPsMembers,
        (SELECT COUNT(*) FROM Medical_Information WHERE PWD = 1)             AS pwdStudents,
        (SELECT CAST(AVG(LatestGPA) AS DECIMAL(4,2)) FROM Other_Information) AS avgGPA;
END
GO

CREATE OR ALTER PROCEDURE usp_Stats_ByProgram
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.ProgramName AS label, COUNT(g.GenID) AS value
    FROM Program p LEFT JOIN General_Information g ON g.ProgramID = p.ProgramID
    GROUP BY p.ProgramName HAVING COUNT(g.GenID) > 0 ORDER BY value DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_Stats_ByCampus
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.CampusName AS label, COUNT(g.GenID) AS value
    FROM Campus c LEFT JOIN General_Information g ON g.CampusID = c.CampusID
    GROUP BY c.CampusName HAVING COUNT(g.GenID) > 0 ORDER BY value DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_Stats_BySex
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.SexName AS label, COUNT(g.GenID) AS value
    FROM Sex s LEFT JOIN General_Information g ON g.SexID = s.SexID
    GROUP BY s.SexName ORDER BY value DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_Stats_ByRegion
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.RegionName AS label, COUNT(g.GenID) AS value
    FROM Region r INNER JOIN General_Information g ON g.RegionID = r.RegionID
    GROUP BY r.RegionName ORDER BY value DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_Stats_ByIncome
AS
BEGIN
    SET NOCOUNT ON;
    SELECT h.IncomeName AS label, COUNT(f.FamID) AS value
    FROM House_Income h INNER JOIN Family_Background f ON f.HouseIncomeID = h.HouseIncome
    GROUP BY h.IncomeName ORDER BY value DESC;
END
GO

-- ------------------------------------------------------------
--  STUDENT LIST + FILTERS  (GET /api/students)
--  Every filter is optional: pass NULL to skip it.
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE usp_Student_Search
    @Search    NVARCHAR(100) = NULL,
    @ProgramID INT = NULL,
    @CampusID  INT = NULL,
    @SexID     INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT g.GenID, g.StudentNo, g.LName, g.FName, g.MName, g.YearSec, g.Age, g.Email, g.Contact,
           p.ProgramName, c.CampusName, s.SexName, r.RegionName
    FROM General_Information g
    INNER JOIN Program p ON p.ProgramID = g.ProgramID
    INNER JOIN Campus  c ON c.CampusID  = g.CampusID
    LEFT  JOIN Sex     s ON s.SexID     = g.SexID
    LEFT  JOIN Region  r ON r.RegionID  = g.RegionID
    WHERE (@Search IS NULL
           OR g.LName     LIKE '%' + @Search + '%'
           OR g.FName     LIKE '%' + @Search + '%'
           OR g.StudentNo LIKE '%' + @Search + '%')
      AND (@ProgramID IS NULL OR g.ProgramID = @ProgramID)
      AND (@CampusID  IS NULL OR g.CampusID  = @CampusID)
      AND (@SexID     IS NULL OR g.SexID     = @SexID)
    ORDER BY g.LName, g.FName;
END
GO

-- ------------------------------------------------------------
--  FULL STUDENT PROFILE  (GET /api/students/:id)
--  Returns 9 result sets, ALWAYS in this order:
--   1 general | 2 family | 3 siblings | 4 education | 5 medical
--   6 medications | 7 other | 8 school orgs | 9 community orgs
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE usp_Student_GetDetail
    @GenID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- grandchild tables hang off a child table's ID, so look those up first
    DECLARE @FamID   INT = (SELECT TOP 1 FamID   FROM Family_Background   WHERE GenID = @GenID);
    DECLARE @MedID   INT = (SELECT TOP 1 MedID   FROM Medical_Information WHERE GenID = @GenID);
    DECLARE @ExtraID INT = (SELECT TOP 1 ExtraID FROM Extracurricular    WHERE GenID = @GenID);

    -- 1) general
    SELECT g.*, c.CampusName, p.ProgramName, sm.SemNo, ay.AcadYear,
           sx.SexName, cs.StatusName AS CivilStatus, rl.ReligionName,
           rg.RegionName, rs.ResiName AS Residence
    FROM General_Information g
    LEFT JOIN Campus       c  ON c.CampusID    = g.CampusID
    LEFT JOIN Program      p  ON p.ProgramID   = g.ProgramID
    LEFT JOIN Semester     sm ON sm.SemID      = g.SemID
    LEFT JOIN AcademicYear ay ON ay.AcadYearID = g.AcadYearID
    LEFT JOIN Sex          sx ON sx.SexID      = g.SexID
    LEFT JOIN Civil_Status cs ON cs.CStatusID  = g.CivilStatusID
    LEFT JOIN Religion     rl ON rl.ReligionID = g.ReligionID
    LEFT JOIN Region       rg ON rg.RegionID   = g.RegionID
    LEFT JOIN Residence    rs ON rs.ResidenceID = g.ResidenceID
    WHERE g.GenID = @GenID;

    -- 2) family
    SELECT f.*, m.MartialName, la.LivingName, hi.IncomeName
    FROM Family_Background f
    LEFT JOIN Marital            m  ON m.MaritalID  = f.MaritalID
    LEFT JOIN Living_Arrangement la ON la.LivingID  = f.LivingID
    LEFT JOIN House_Income       hi ON hi.HouseIncome = f.HouseIncomeID
    WHERE f.GenID = @GenID;

    -- 3) siblings
    SELECT * FROM Siblings WHERE FamID = @FamID ORDER BY SibAge DESC;
    -- 4) education
    SELECT * FROM Educational_Background WHERE GenID = @GenID;
    -- 5) medical
    SELECT * FROM Medical_Information WHERE GenID = @GenID;
    -- 6) medications
    SELECT * FROM Medication WHERE MedID = @MedID;
    -- 7) other
    SELECT * FROM Other_Information WHERE GenID = @GenID;
    -- 8) school organizations
    SELECT * FROM School_Organization WHERE ExtraID = @ExtraID ORDER BY SYear;
    -- 9) community organizations
    SELECT * FROM Community_Organization WHERE ExtraID = @ExtraID ORDER BY CYear;
END
GO

-- quick test after running this script:
--   EXEC usp_Lookup_Get @Type = 'campus';
--   EXEC usp_Stats_Summary;
--   EXEC usp_Student_Search @Search = 'cruz';
--   EXEC usp_Student_GetDetail @GenID = 1;
