// ============================================================
//  server.js  —  Pink Horizon Academy
//
//  Full flow:
//    1. APPLY      POST /api/apply      -> INSERTs across the
//                  PersonINFO tables in ONE transaction, then
//                  creates a UserAccount (bcrypt-hashed password).
//    2. LOGIN      POST /api/login      -> verifies the hash,
//                  starts a session.
//    3. ME         GET  /api/me         -> current logged-in student.
//    4. LMS        GET  /api/lms/home   -> student's own profile + panels.
//    5. LOGOUT     POST /api/logout
//
//  Registrar/analytics routes (dashboard, students, stats) are
//  kept from the original build.
// ============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { sql, runQuery, poolPromise } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "pink-horizon-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 4 }, // 4 hours
  })
);
app.use(express.static(path.join(__dirname, "public")));

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(`[api] ${req.method} ${req.originalUrl} ->`, err.message);
    res.status(500).json({ error: err.message });
  });

// Guard for routes that require a logged-in user
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

// ---------- HEALTH ----------
app.get(
  "/api/health",
  wrap(async (_req, res) => {
    await poolPromise;
    const rows = await runQuery("SELECT DB_NAME() AS db, SUSER_SNAME() AS login;");
    res.json({ status: "ok", ...rows[0] });
  })
);

// ---------- LOOKUPS (for the application form dropdowns) ----------
app.get(
  "/api/lookups",
  wrap(async (_req, res) => {
    const [
      campus, program, semester, acadYear, region, religion, sex, civil,
      residence, marital, living, income,
    ] = await Promise.all([
      runQuery("SELECT CampusID AS id, CampusName AS name FROM Campus ORDER BY CampusName;"),
      runQuery("SELECT ProgramID AS id, ProgramName AS name FROM Program ORDER BY ProgramName;"),
      runQuery("SELECT SemID AS id, SemNo AS name FROM Semester ORDER BY SemID;"),
      runQuery("SELECT AcadYearID AS id, AcadYear AS name FROM AcademicYear ORDER BY AcadYear;"),
      runQuery("SELECT RegionID AS id, RegionName AS name FROM Region ORDER BY RegionID;"),
      runQuery("SELECT ReligionID AS id, ReligionName AS name FROM Religion ORDER BY ReligionName;"),
      runQuery("SELECT SexID AS id, SexName AS name FROM Sex ORDER BY SexID;"),
      runQuery("SELECT CStatusID AS id, StatusName AS name FROM Civil_Status ORDER BY CStatusID;"),
      runQuery("SELECT ResidenceID AS id, ResiName AS name FROM Residence ORDER BY ResiName;"),
      runQuery("SELECT MaritalID AS id, MartialName AS name FROM Marital ORDER BY MaritalID;"),
      runQuery("SELECT LivingID AS id, LivingName AS name FROM Living_Arrangement ORDER BY LivingID;"),
      runQuery("SELECT HouseIncome AS id, IncomeName AS name FROM House_Income ORDER BY HouseIncome;"),
    ]);
    res.json({ campus, program, semester, acadYear, region, religion, sex, civil, residence, marital, living, income });
  })
);

// ============================================================
//  APPLY  —  the core INSERT flow (one transaction)
//  Body: { general:{...}, family:{...}, education:{...},
//          medical:{...}, other:{...}, account:{username,password} }
// ============================================================
app.post(
  "/api/apply",
  wrap(async (req, res) => {
    const { general = {}, family = {}, education = {}, medical = {}, other = {}, account = {} } = req.body;

    // ---- basic validation ----
    if (!general.FName || !general.LName) return res.status(400).json({ error: "First and last name are required." });
    if (!general.CampusID || !general.ProgramID) return res.status(400).json({ error: "Campus and Program are required." });
    if (!account.username || !account.password) return res.status(400).json({ error: "Username and password are required." });
    if (account.password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters." });
    if (general.Email && !/^[^\s@]+@gmail\.com$/i.test(general.Email))
      return res.status(400).json({ error: "Email must be a valid address ending in @gmail.com." });

    const pool = await poolPromise;

    // Reject a duplicate username early (friendlier than a DB error)
    const dupe = await pool
      .request()
      .input("u", sql.NVarChar, account.username)
      .query("SELECT UserID FROM UserAccount WHERE Username = @u;");
    if (dupe.recordset.length) return res.status(409).json({ error: "That username is already taken." });

    // Auto-generate a Student No if none supplied: e.g. PHA-2026-000123
    const year = new Date().getFullYear();

    const passwordHash = await bcrypt.hash(account.password, 10);

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const rq = () => new sql.Request(tx);

      // 1) General_Information (parent record)
      const genResult = await rq()
        .input("CampusID", sql.Int, num(general.CampusID))
        .input("SemID", sql.Int, num(general.SemID))
        .input("ProgramID", sql.Int, num(general.ProgramID))
        .input("AcadYearID", sql.Int, num(general.AcadYearID))
        .input("StudentNo", sql.NVarChar, general.StudentNo || `PHA-${year}-TEMP`)
        .input("YearSec", sql.NVarChar, general.YearSec || null)
        .input("LName", sql.NVarChar, general.LName)
        .input("FName", sql.NVarChar, general.FName)
        .input("MName", sql.NVarChar, general.MName || null)
        .input("Nickname", sql.NVarChar, general.Nickname || null)
        .input("Age", sql.Int, num(general.Age))
        .input("SexID", sql.Int, num(general.SexID))
        .input("CivilStatusID", sql.Int, num(general.CivilStatusID))
        .input("ReligionID", sql.Int, num(general.ReligionID))
        .input("Birthday", sql.Date, general.Birthday || null)
        .input("Birthplace", sql.NVarChar, general.Birthplace || null)
        .input("Citizenship", sql.NVarChar, general.Citizenship || null)
        .input("RegionID", sql.Int, num(general.RegionID))
        .input("LanguageSpoken", sql.NVarChar, general.LanguageSpoken || null)
        .input("Indigenous", sql.NVarChar, general.Indigenous || null)
        .input("ResidenceID", sql.Int, num(general.ResidenceID))
        .input("PresentAdd", sql.NVarChar, general.PresentAdd || null)
        .input("PermanentAdd", sql.NVarChar, general.PermanentAdd || null)
        .input("Contact", sql.NVarChar, general.Contact || null)
        .input("Email", sql.NVarChar, general.Email || null)
        .input("Link", sql.NVarChar, general.Link || null)
        .query(`
          INSERT INTO General_Information
            (CampusID, SemID, ProgramID, AcadYearID, StudentNo, YearSec, LName, FName, MName,
             Nickname, Age, SexID, CivilStatusID, ReligionID, Birthday, Birthplace, Citizenship,
             RegionID, LanguageSpoken, Indigenous, ResidenceID, PresentAdd, PermanentAdd, Contact, Email, Link)
          OUTPUT INSERTED.GenID
          VALUES
            (@CampusID, @SemID, @ProgramID, @AcadYearID, @StudentNo, @YearSec, @LName, @FName, @MName,
             @Nickname, @Age, @SexID, @CivilStatusID, @ReligionID, @Birthday, @Birthplace, @Citizenship,
             @RegionID, @LanguageSpoken, @Indigenous, @ResidenceID, @PresentAdd, @PermanentAdd, @Contact, @Email, @Link);
        `);

      const genId = genResult.recordset[0].GenID;

      // Give it a real student number based on the new id, if none was supplied
      const studentNo = general.StudentNo || `PHA-${year}-${String(genId).padStart(5, "0")}`;
      if (!general.StudentNo) {
        await rq()
          .input("GenID", sql.Int, genId)
          .input("StudentNo", sql.NVarChar, studentNo)
          .query("UPDATE General_Information SET StudentNo=@StudentNo WHERE GenID=@GenID;");
      }

      // 2) Family_Background (optional, but usually filled)
      if (hasAny(family)) {
        await rq()
          .input("GenID", sql.Int, genId)
          .input("MaritalID", sql.Int, num(family.MaritalID))
          .input("LivingID", sql.Int, num(family.LivingID))
          .input("FName", sql.NVarChar, family.FName || null)
          .input("Foccupation", sql.NVarChar, family.Foccupation || null)
          .input("Fcontact", sql.NVarChar, family.Fcontact || null)
          .input("Mname", sql.NVarChar, family.Mname || null)
          .input("Moccupation", sql.NVarChar, family.Moccupation || null)
          .input("Mcontact", sql.NVarChar, family.Mcontact || null)
          .input("NumofSibs", sql.Int, num(family.NumofSibs))
          .input("Birthorder", sql.Int, num(family.Birthorder))
          .input("HouseIncomeID", sql.Int, num(family.HouseIncomeID))
          .input("Is4PsMember", sql.Bit, family.Is4PsMember ? 1 : 0)
          .input("Finance", sql.NVarChar, family.Finance || null)
          .query(`
            INSERT INTO Family_Background
              (GenID, MaritalID, LivingID, FName, Foccupation, Fcontact,
               Mname, Moccupation, Mcontact, NumofSibs, Birthorder, HouseIncomeID, Is4PsMember, Finance)
            VALUES
              (@GenID, @MaritalID, @LivingID, @FName, @Foccupation, @Fcontact,
               @Mname, @Moccupation, @Mcontact, @NumofSibs, @Birthorder, @HouseIncomeID, @Is4PsMember, @Finance);
          `);
      }

      // 3) Educational_Background
      if (hasAny(education)) {
        await rq()
          .input("GenID", sql.Int, genId)
          .input("ElemName", sql.NVarChar, education.ElemName || null)
          .input("ElemYear", sql.NVarChar, education.ElemYear || null)
          .input("JHName", sql.NVarChar, education.JHName || null)
          .input("JHYear", sql.NVarChar, education.JHYear || null)
          .input("SHName", sql.NVarChar, education.SHName || null)
          .input("SHYear", sql.NVarChar, education.SHYear || null)
          .input("SHTrack", sql.NVarChar, education.SHTrack || null)
          .input("Awards", sql.NVarChar, education.Awards || null)
          .input("Scholar", sql.NVarChar, education.Scholar || null)
          .query(`
            INSERT INTO Educational_Background
              (GenID, ElemName, ElemYear, JHName, JHYear, SHName, SHYear, SHTrack, Awards, Scholar)
            VALUES
              (@GenID, @ElemName, @ElemYear, @JHName, @JHYear, @SHName, @SHYear, @SHTrack, @Awards, @Scholar);
          `);
      }

      // 4) Medical_Information
      if (hasAny(medical)) {
        await rq()
          .input("GenID", sql.Int, genId)
          .input("Height", sql.Decimal(4, 2), num(medical.Height))
          .input("Weight", sql.Decimal(5, 2), num(medical.Weight))
          .input("PWD", sql.Bit, medical.PWD ? 1 : 0)
          .input("Disability", sql.NVarChar, medical.Disability || null)
          .input("Chronic", sql.NVarChar, medical.Chronic || null)
          .query(`
            INSERT INTO Medical_Information (GenID, Height, Weight, PWD, Disability, Chronic)
            VALUES (@GenID, @Height, @Weight, @PWD, @Disability, @Chronic);
          `);
      }

      // 5) Other_Information
      if (hasAny(other)) {
        await rq()
          .input("GenID", sql.Int, genId)
          .input("Sinterest", sql.NVarChar, other.Sinterest || null)
          .input("Skill", sql.NVarChar, other.Skill || null)
          .input("Hobbies", sql.NVarChar, other.Hobbies || null)
          .input("Ambition", sql.NVarChar, other.Ambition || null)
          .input("Motto", sql.NVarChar, other.Motto || null)
          .query(`
            INSERT INTO Other_Information (GenID, Sinterest, Skill, Hobbies, Ambition, Motto, DateFiled)
            VALUES (@GenID, @Sinterest, @Skill, @Hobbies, @Ambition, @Motto, CAST(GETDATE() AS DATE));
          `);
      }

      // 6) UserAccount (the login) — password already hashed
      await rq()
        .input("GenID", sql.Int, genId)
        .input("Username", sql.NVarChar, account.username)
        .input("PasswordHash", sql.NVarChar, passwordHash)
        .input("Role", sql.NVarChar, "student")
        .query(`
          INSERT INTO UserAccount (GenID, Username, PasswordHash, Role)
          VALUES (@GenID, @Username, @PasswordHash, @Role);
        `);

      await tx.commit();

      res.json({
        status: "registered",
        genId,
        studentNo,
        username: account.username,
        message: "Your Pink Horizon Academy account has been created.",
      });
    } catch (err) {
      await tx.rollback();
      // Unique violation -> friendly message
      if (String(err.message).includes("UQ_UserAccount_Username")) {
        return res.status(409).json({ error: "That username is already taken." });
      }
      throw err;
    }
  })
);

// ============================================================
//  LOGIN
// ============================================================
app.post(
  "/api/login",
  wrap(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required." });

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("u", sql.NVarChar, username)
      .query(`
        SELECT ua.UserID, ua.GenID, ua.Username, ua.PasswordHash, ua.Role,
               g.FName, g.LName, g.StudentNo
        FROM UserAccount ua
        INNER JOIN General_Information g ON g.GenID = ua.GenID
        WHERE ua.Username = @u AND ua.IsActive = 1;
      `);

    if (!result.recordset.length) return res.status(401).json({ error: "Invalid username or password." });

    const acc = result.recordset[0];
    const ok = await bcrypt.compare(password, acc.PasswordHash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password." });

    req.session.user = {
      userId: acc.UserID,
      genId: acc.GenID,
      username: acc.Username,
      role: acc.Role,
      name: `${acc.FName} ${acc.LName}`,
      studentNo: acc.StudentNo,
    };
    res.json({ status: "ok", user: req.session.user });
  })
);

// ---------- ME / LOGOUT ----------
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  res.json({ user: req.session.user });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ status: "logged out" }));
});

// ============================================================
//  LMS HOME  —  logged-in student's own data (uses their session)
// ============================================================
app.get(
  "/api/lms/home",
  requireAuth,
  wrap(async (req, res) => {
    const id = req.session.user.genId;
    const rows = await runQuery(
      `
      SELECT g.GenID, g.StudentNo, g.FName, g.MName, g.LName, g.YearSec, g.Email, g.Contact,
             p.ProgramName, c.CampusName, sm.SemNo, ay.AcadYear
      FROM General_Information g
      LEFT JOIN Program      p  ON p.ProgramID   = g.ProgramID
      LEFT JOIN Campus       c  ON c.CampusID    = g.CampusID
      LEFT JOIN Semester     sm ON sm.SemID      = g.SemID
      LEFT JOIN AcademicYear ay ON ay.AcadYearID = g.AcadYearID
      WHERE g.GenID = @id;
      `,
      [{ name: "id", value: id }]
    );
    if (!rows.length) return res.status(404).json({ error: "Profile not found" });

    // A few mock LMS panels (course list is illustrative; not in schema)
    const student = rows[0];
    const courses = sampleCourses(student.ProgramName);
    res.json({
      student,
      announcements: [
        { title: "Welcome to Pink Horizon Academy!", date: today(), body: "Your enrollment is confirmed. Check your class schedule below." },
        { title: "Orientation Week", date: today(), body: "Attend the general assembly at the Villamor Gymnasium." },
      ],
      courses,
    });
  })
);

// ============================================================
//  REGISTRAR ANALYTICS + STUDENT LIST (kept from original)
// ============================================================
app.get("/api/stats/summary", wrap(async (_req, res) => {
  const rows = await runQuery(`
    SELECT
      (SELECT COUNT(*) FROM General_Information)                       AS totalStudents,
      (SELECT COUNT(*) FROM Program)                                   AS totalPrograms,
      (SELECT COUNT(*) FROM Campus)                                    AS totalCampuses,
      (SELECT COUNT(*) FROM UserAccount)                               AS totalAccounts,
      (SELECT COUNT(*) FROM Family_Background WHERE Is4PsMember=1)     AS fourPsMembers,
      (SELECT COUNT(*) FROM Medical_Information WHERE PWD=1)           AS pwdStudents,
      (SELECT CAST(AVG(LatestGPA) AS DECIMAL(4,2)) FROM Other_Information) AS avgGPA;
  `);
  res.json(rows[0]);
}));

app.get("/api/stats/by-program", wrap(async (_req, res) => {
  res.json(await runQuery(`
    SELECT p.ProgramName AS label, COUNT(g.GenID) AS value
    FROM Program p LEFT JOIN General_Information g ON g.ProgramID = p.ProgramID
    GROUP BY p.ProgramName HAVING COUNT(g.GenID) > 0 ORDER BY value DESC;`));
}));

app.get("/api/stats/by-campus", wrap(async (_req, res) => {
  res.json(await runQuery(`
    SELECT c.CampusName AS label, COUNT(g.GenID) AS value
    FROM Campus c LEFT JOIN General_Information g ON g.CampusID = c.CampusID
    GROUP BY c.CampusName HAVING COUNT(g.GenID) > 0 ORDER BY value DESC;`));
}));

app.get("/api/stats/by-sex", wrap(async (_req, res) => {
  res.json(await runQuery(`
    SELECT s.SexName AS label, COUNT(g.GenID) AS value
    FROM Sex s LEFT JOIN General_Information g ON g.SexID = s.SexID
    GROUP BY s.SexName ORDER BY value DESC;`));
}));

app.get("/api/stats/by-region", wrap(async (_req, res) => {
  res.json(await runQuery(`
    SELECT r.RegionName AS label, COUNT(g.GenID) AS value
    FROM Region r INNER JOIN General_Information g ON g.RegionID = r.RegionID
    GROUP BY r.RegionName ORDER BY value DESC;`));
}));

app.get("/api/stats/by-income", wrap(async (_req, res) => {
  res.json(await runQuery(`
    SELECT h.IncomeName AS label, COUNT(f.FamID) AS value
    FROM House_Income h INNER JOIN Family_Background f ON f.HouseIncomeID = h.HouseIncome
    GROUP BY h.IncomeName ORDER BY value DESC;`));
}));

app.get("/api/students", wrap(async (req, res) => {
  const { search, programId, campusId, sexId } = req.query;
  const clauses = [], params = [];
  if (search) { clauses.push("(g.LName LIKE @search OR g.FName LIKE @search OR g.StudentNo LIKE @search)"); params.push({ name: "search", value: `%${search}%` }); }
  if (programId) { clauses.push("g.ProgramID = @programId"); params.push({ name: "programId", value: Number(programId) }); }
  if (campusId) { clauses.push("g.CampusID = @campusId"); params.push({ name: "campusId", value: Number(campusId) }); }
  if (sexId) { clauses.push("g.SexID = @sexId"); params.push({ name: "sexId", value: Number(sexId) }); }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  res.json(await runQuery(`
    SELECT g.GenID, g.StudentNo, g.LName, g.FName, g.MName, g.YearSec, g.Age, g.Email, g.Contact,
           p.ProgramName, c.CampusName, s.SexName, r.RegionName
    FROM General_Information g
    INNER JOIN Program p ON p.ProgramID = g.ProgramID
    INNER JOIN Campus  c ON c.CampusID  = g.CampusID
    LEFT  JOIN Sex     s ON s.SexID     = g.SexID
    LEFT  JOIN Region  r ON r.RegionID  = g.RegionID
    ${where} ORDER BY g.LName, g.FName;`, params));
}));

app.get("/api/students/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const params = [{ name: "id", value: id }];
  const general = await runQuery(`
    SELECT g.*, c.CampusName, p.ProgramName, sm.SemNo, ay.AcadYear,
           sx.SexName, cs.StatusName AS CivilStatus, rl.ReligionName, rg.RegionName, rs.ResiName AS Residence
    FROM General_Information g
    LEFT JOIN Campus c ON c.CampusID=g.CampusID
    LEFT JOIN Program p ON p.ProgramID=g.ProgramID
    LEFT JOIN Semester sm ON sm.SemID=g.SemID
    LEFT JOIN AcademicYear ay ON ay.AcadYearID=g.AcadYearID
    LEFT JOIN Sex sx ON sx.SexID=g.SexID
    LEFT JOIN Civil_Status cs ON cs.CStatusID=g.CivilStatusID
    LEFT JOIN Religion rl ON rl.ReligionID=g.ReligionID
    LEFT JOIN Region rg ON rg.RegionID=g.RegionID
    LEFT JOIN Residence rs ON rs.ResidenceID=g.ResidenceID
    WHERE g.GenID=@id;`, params);
  if (!general.length) return res.status(404).json({ error: "Student not found" });

  const family = await runQuery(`
    SELECT f.*, m.MartialName, la.LivingName, hi.IncomeName
    FROM Family_Background f
    LEFT JOIN Marital m ON m.MaritalID=f.MaritalID
    LEFT JOIN Living_Arrangement la ON la.LivingID=f.LivingID
    LEFT JOIN House_Income hi ON hi.HouseIncome=f.HouseIncomeID
    WHERE f.GenID=@id;`, params);

  const famId = family.length ? family[0].FamID : -1;
  const famParams = [{ name: "famId", value: famId }];
  const [siblings, education, medical, other, extracurricular] = await Promise.all([
    runQuery("SELECT * FROM Siblings WHERE FamID=@famId ORDER BY SibAge DESC;", famParams),
    runQuery("SELECT * FROM Educational_Background WHERE GenID=@id;", params),
    runQuery("SELECT * FROM Medical_Information WHERE GenID=@id;", params),
    runQuery("SELECT * FROM Other_Information WHERE GenID=@id;", params),
    runQuery("SELECT * FROM Extracurricular WHERE GenID=@id;", params),
  ]);
  let medications = [];
  if (medical.length) medications = await runQuery("SELECT * FROM Medication WHERE MedID=@medId;", [{ name: "medId", value: medical[0].MedID }]);
  let schoolOrgs = [], commOrgs = [];
  if (extracurricular.length) {
    const exParams = [{ name: "exId", value: extracurricular[0].ExtraID }];
    [schoolOrgs, commOrgs] = await Promise.all([
      runQuery("SELECT * FROM School_Organization WHERE ExtraID=@exId ORDER BY SYear;", exParams),
      runQuery("SELECT * FROM Community_Organization WHERE ExtraID=@exId ORDER BY CYear;", exParams),
    ]);
  }
  res.json({
    general: general[0], family: family[0] || null, siblings,
    education: education[0] || null, medical: medical[0] || null, medications,
    other: other[0] || null, schoolOrgs, commOrgs,
  });
}));

// ---------- helpers ----------
function num(v) { return v === "" || v === undefined || v === null ? null : Number(v); }
function hasAny(obj) { return Object.values(obj).some((v) => v !== "" && v !== null && v !== undefined && v !== false); }
function today() { return new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }); }
function sampleCourses(program) {
  const base = [
    { code: "GEC 1", title: "Understanding the Self", units: 3, sched: "MWF 8:00–9:00" },
    { code: "PE 1", title: "Physical Fitness", units: 2, sched: "TTh 10:00–11:30" },
    { code: "NSTP 1", title: "National Service Training", units: 3, sched: "Sat 8:00–11:00" },
  ];
  const p = (program || "").toLowerCase();
  if (p.includes("information technology")) base.unshift({ code: "AIT 101", title: "Intro to Computing", units: 3, sched: "MWF 9:00–10:00" }, { code: "AIT 102", title: "Database Systems", units: 3, sched: "TTh 1:00–2:30" });
  else if (p.includes("aeronautical")) base.unshift({ code: "AE 101", title: "Aerodynamics I", units: 3, sched: "MWF 9:00–10:00" });
  else if (p.includes("maintenance")) base.unshift({ code: "AMT 101", title: "Aircraft Systems", units: 3, sched: "MWF 9:00–10:00" });
  else if (p.includes("transportation")) base.unshift({ code: "AT 101", title: "Air Navigation", units: 3, sched: "MWF 9:00–10:00" });
  return base;
}

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`\n  Pink Horizon Academy running:  http://localhost:${PORT}\n`));
