-- ============================================================
--  Pink Horizon Academy — UserAccount table
--
--  Adds a login/authentication layer on top of the existing
--  PersonINFO schema WITHOUT changing any existing table.
--
--  One student (General_Information) has exactly one account.
--  Password is stored HASHED (bcrypt) — never in plain text.
--
--  Run this ONCE in SSMS after the main schema + seed scripts.
-- ============================================================

USE PersonINFO;
GO

IF OBJECT_ID('dbo.UserAccount', 'U') IS NOT NULL
    DROP TABLE dbo.UserAccount;
GO

CREATE TABLE UserAccount (
    UserID        INT IDENTITY(1,1) PRIMARY KEY,
    GenID         INT NOT NULL,
    Username      NVARCHAR(60)  NOT NULL,
    PasswordHash  NVARCHAR(255) NOT NULL,          -- bcrypt hash
    Role          NVARCHAR(20)  NOT NULL DEFAULT 'student',  -- student | admin
    CreatedAt     DATETIME      NOT NULL DEFAULT GETDATE(),
    IsActive      BIT           NOT NULL DEFAULT 1,

    -- UNIQUE constraint: no two accounts share a username
    CONSTRAINT UQ_UserAccount_Username UNIQUE (Username),

    -- UNIQUE constraint: one account per student record
    CONSTRAINT UQ_UserAccount_GenID UNIQUE (GenID),

    -- FOREIGN KEY back to the central student record
    CONSTRAINT FK_UserAccount_GenInfo
        FOREIGN KEY (GenID) REFERENCES General_Information(GenID)
);
GO

-- Quick check
SELECT * FROM UserAccount;
GO
