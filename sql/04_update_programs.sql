-- ============================================================
--  PhilSCA — Update Program table with real programs
--  Run this in SSMS against PersonINFO
-- ============================================================

USE PersonINFO;
GO

-- Clear old sample programs (safe only if no students reference them yet)
-- If you have enrolled students, skip the DELETE and just INSERT new ones.
DELETE FROM General_Information WHERE StudentNo = 'ADMIN-001';
DELETE FROM UserAccount WHERE Username = 'admin';
DELETE FROM Program;
GO

-- Re-seed identity so IDs start fresh from 1
DBCC CHECKIDENT ('Program', RESEED, 0);
GO

-- ============================================================
--  Institute of Engineering and Technology (IET)
-- ============================================================
INSERT INTO Program (ProgramName) VALUES ('BS Aeronautical Engineering (BSAE)');
INSERT INTO Program (ProgramName) VALUES ('BS Aircraft Maintenance Technology (BSAMT)');
INSERT INTO Program (ProgramName) VALUES ('BS Aviation Electronics Technology (BSAET)');
INSERT INTO Program (ProgramName) VALUES ('BS Aviation Technology (BSATech)');
INSERT INTO Program (ProgramName) VALUES ('Associate in Aircraft Maintenance Technology (AAMT)');
INSERT INTO Program (ProgramName) VALUES ('Associate in Aviation Electronics Technology (AAET)');

-- ============================================================
--  Institute of Computer Studies (ICS)
-- ============================================================
INSERT INTO Program (ProgramName) VALUES ('BS Aviation Information Technology (BSAIT)');
INSERT INTO Program (ProgramName) VALUES ('BS Information Management - Airline Operation Procedures (BSIM-AOP)');
INSERT INTO Program (ProgramName) VALUES ('Associate in Aviation Information Technology (AAIT)');

-- ============================================================
--  Institute of Aviation Safety and Management (IASM)
-- ============================================================
INSERT INTO Program (ProgramName) VALUES ('BS Air Transportation (BSAT)');
INSERT INTO Program (ProgramName) VALUES ('BS Air Traffic Control (BSATC)');
INSERT INTO Program (ProgramName) VALUES ('BS Aviation Management (BSAM)');
INSERT INTO Program (ProgramName) VALUES ('BS Aviation Logistics (BSAL)');
INSERT INTO Program (ProgramName) VALUES ('BS/AB Aviation Tourism');
INSERT INTO Program (ProgramName) VALUES ('BS/AB Aviation Communication');
INSERT INTO Program (ProgramName) VALUES ('BS/AB Aviation Safety and Security Management');

-- ============================================================
--  Flying and Vocational Training
-- ============================================================
INSERT INTO Program (ProgramName) VALUES ('Private Pilot Course');
INSERT INTO Program (ProgramName) VALUES ('Commercial Pilot Course');
INSERT INTO Program (ProgramName) VALUES ('Multi-Engine Rating');
INSERT INTO Program (ProgramName) VALUES ('Instrument Rating');

-- ============================================================
--  Graduate Studies
-- ============================================================
INSERT INTO Program (ProgramName) VALUES ('Master of Education in Aeronautical Management (MEAM)');
INSERT INTO Program (ProgramName) VALUES ('Master in Public Administration (MPA)');
INSERT INTO Program (ProgramName) VALUES ('Doctor of Public Administration (DPA)');
INSERT INTO Program (ProgramName) VALUES ('Doctor of Aeronautical Education (DAE)');
GO

-- Re-insert admin account (was deleted above with old GenID)
INSERT INTO General_Information (CampusID, ProgramID, StudentNo, LName, FName)
VALUES (1, 1, 'ADMIN-001', 'Administrator', 'Pink Horizon');
GO

DECLARE @adminID INT = (SELECT GenID FROM General_Information WHERE StudentNo = 'ADMIN-001');
INSERT INTO UserAccount (GenID, Username, PasswordHash, Role)
VALUES (
    @adminID,
    'admin',
    '$2b$10$1OZeOAktbaiOD9VjkOFIUeqRQvInoHzGjHzgzdy3rJSqRrgz94DMW',
    'admin'
);
GO

-- Verify
SELECT ProgramID, ProgramName FROM Program ORDER BY ProgramID;
GO
