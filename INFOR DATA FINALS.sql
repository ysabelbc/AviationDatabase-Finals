-- all students
USE PersonINFO;
GO

SELECT
    g.GenID,
    g.StudentNo,
    g.LName + ', ' + g.FName + ' ' + ISNULL(g.MName, '') AS FullName,
    p.ProgramName,
    c.CampusName,
    g.YearSec,
    g.Age,
    s.SexName,
    r.RegionName,
    g.Email,
    g.Contact
FROM General_Information g
INNER JOIN Program p  ON p.ProgramID = g.ProgramID
INNER JOIN Campus  c  ON c.CampusID  = g.CampusID
LEFT  JOIN Sex     s  ON s.SexID     = g.SexID
LEFT  JOIN Region  r  ON r.RegionID  = g.RegionID
ORDER BY g.GenID;
GO


--all logins
SELECT
    ua.UserID,
    ua.GenID,
    g.StudentNo,
    g.FName + ' ' + g.LName AS StudentName,
    ua.Username,
    ua.Role,
    ua.PasswordHash,
    ua.CreatedAt
FROM UserAccount ua
INNER JOIN General_Information g ON g.GenID = ua.GenID
ORDER BY ua.CreatedAt DESC;
GO


--raw

USE PersonINFO;
SELECT * FROM General_Information
GO

USE PersonINFO;
GO

---- Delete GenID 1-5 and all their related child records.
---- Order matters: deepest children first, parent (General_Information) last.

---- Children of Extracurricular
--DELETE so FROM School_Organization so
--    JOIN Extracurricular e ON e.ExtraID = so.ExtraID
--    WHERE e.GenID BETWEEN 1 AND 5;

--DELETE co FROM Community_Organization co
--    JOIN Extracurricular e ON e.ExtraID = co.ExtraID
--    WHERE e.GenID BETWEEN 1 AND 5;

--DELETE FROM Extracurricular WHERE GenID BETWEEN 1 AND 5;

---- Children of Medical_Information
--DELETE m FROM Medication m
--    JOIN Medical_Information mi ON mi.MedID = m.MedID
--    WHERE mi.GenID BETWEEN 1 AND 5;

--DELETE FROM Medical_Information WHERE GenID BETWEEN 1 AND 5;

---- Children of Family_Background
--DELETE s FROM Siblings s
--    JOIN Family_Background f ON f.FamID = s.FamID
--    WHERE f.GenID BETWEEN 1 AND 5;

--DELETE FROM Family_Background WHERE GenID BETWEEN 1 AND 5;

---- Other direct children of General_Information
--DELETE FROM Educational_Background WHERE GenID BETWEEN 1 AND 5;
--DELETE FROM Other_Information       WHERE GenID BETWEEN 1 AND 5;
--DELETE FROM UserAccount             WHERE GenID BETWEEN 1 AND 5;

---- Finally the parent records
--DELETE FROM General_Information WHERE GenID BETWEEN 1 AND 5;
--GO

---- Verify
--SELECT GenID, StudentNo, FName, LName FROM General_Information ORDER BY GenID;
--GO

SELECT * FROM SYS.TABLES
SELECT * FROM SYS.procedures
SELECT * FROM SYS.DATABASE
SELECT * FROM SYS.TABLES