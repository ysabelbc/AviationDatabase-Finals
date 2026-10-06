// ============================================================
//  server.js  —  Pink Horizon Academy   (STORED-PROCEDURE version)
//
//  Every route calls a stored procedure through runProc().
//  No route contains SQL, and the front end never touches a table:
//
//     browser -> fetch('/api/...') -> this file -> EXEC usp_... -> tables
//
//  The procedures live in sql/05_stored_procedures.sql.
//
//  Full flow:
//    1. APPLY      POST /api/apply      -> usp_Student_Apply (one transaction
//                  inside SQL Server), password hashed here with bcrypt.
//    2. LOGIN      POST /api/login      -> usp_User_Login, verify hash, session.
//    3. ME         GET  /api/me         -> current logged-in student.
//    4. LMS        GET  /api/lms/home   -> usp_Student_GetHome.
//    5. LOGOUT     POST /api/logout
//  Registrar/analytics: usp_Stats_*, usp_Student_Search, usp_Student_GetDetail.
// ============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { sql, runProc, runProcMulti, poolPromise } = require("./db");

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

// Small builders for stored-procedure parameters: { name, type, value }
// name = the procedure's parameter name WITHOUT the "@"
const P = {
  int:  (name, v)       => ({ name, type: sql.Int, value: num(v) }),
  str:  (name, v)       => ({ name, type: sql.NVarChar, value: v || null }),
  bit:  (name, v)       => ({ name, type: sql.Bit, value: v ? 1 : 0 }),
  date: (name, v)       => ({ name, type: sql.Date, value: v || null }),
  dec:  (name, v, p, s) => ({ name, type: sql.Decimal(p, s), value: num(v) }),
};

// ---------- HEALTH ----------
app.get(
  "/api/health",
  wrap(async (_req, res) => {
    await poolPromise;
    const rows = await runProc("usp_Health_Check");
    res.json({ status: "ok", ...rows[0] });
  })
);

// ---------- LOOKUPS (for the application form dropdowns) ----------
app.get(
  "/api/lookups",
  wrap(async (_req, res) => {
    // one procedure, @Type chooses which lookup table to read
    const get = (type) => runProc("usp_Lookup_Get", [P.str("Type", type)]);
    const [
      campus, program, semester, acadYear, region, religion, sex, civil,
      residence, marital, living, income,
    ] = await Promise.all([
      get("campus"), get("program"), get("semester"), get("acadYear"),
      get("region"), get("religion"), get("sex"), get("civil"),
      get("residence"), get("marital"), get("living"), get("income"),
    ]);
    res.json({ campus, program, semester, acadYear, region, religion, sex, civil, residence, marital, living, income });
  })
);

// ============================================================
//  APPLY  —  the core INSERT flow
//  Body: { general:{...}, family:{...}, education:{...},
//          medical:{...}, other:{...}, account:{username,password} }
//  The transaction (BEGIN / COMMIT / ROLLBACK) is INSIDE the procedure.
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

    // bcrypt stays in Node: the database only ever sees the hash
    const passwordHash = await bcrypt.hash(account.password, 10);

    try {
      const rows = await runProc("usp_Student_Apply", [
        // --- General_Information ---
        P.int("CampusID", general.CampusID),
        P.int("SemID", general.SemID),
        P.int("ProgramID", general.ProgramID),
        P.int("AcadYearID", general.AcadYearID),
        P.str("StudentNo", general.StudentNo),
        P.str("YearSec", general.YearSec),
        P.str("LName", general.LName),
        P.str("FName", general.FName),
        P.str("MName", general.MName),
        P.str("Nickname", general.Nickname),
        P.int("Age", general.Age),
        P.int("SexID", general.SexID),
        P.int("CivilStatusID", general.CivilStatusID),
        P.int("ReligionID", general.ReligionID),
        P.date("Birthday", general.Birthday),
        P.str("Birthplace", general.Birthplace),
        P.str("Citizenship", general.Citizenship),
        P.int("RegionID", general.RegionID),
        P.str("LanguageSpoken", general.LanguageSpoken),
        P.str("Indigenous", general.Indigenous),
        P.int("ResidenceID", general.ResidenceID),
        P.str("PresentAdd", general.PresentAdd),
        P.str("PermanentAdd", general.PermanentAdd),
        P.str("Contact", general.Contact),
        P.str("Email", general.Email),
        P.str("Link", general.Link),
        // --- Family_Background ---
        P.bit("HasFamily", hasAny(family)),
        P.int("MaritalID", family.MaritalID),
        P.int("LivingID", family.LivingID),
        P.str("FamFName", family.FName),
        P.str("Foccupation", family.Foccupation),
        P.str("Fcontact", family.Fcontact),
        P.str("MotherName", family.Mname),
        P.str("Moccupation", family.Moccupation),
        P.str("Mcontact", family.Mcontact),
        P.int("NumofSibs", family.NumofSibs),
        P.int("Birthorder", family.Birthorder),
        P.int("HouseIncomeID", family.HouseIncomeID),
        P.bit("Is4PsMember", family.Is4PsMember),
        P.str("Finance", family.Finance),
        // --- Educational_Background ---
        P.bit("HasEducation", hasAny(education)),
        P.str("ElemName", education.ElemName),
        P.str("ElemYear", education.ElemYear),
        P.str("JHName", education.JHName),
        P.str("JHYear", education.JHYear),
        P.str("SHName", education.SHName),
        P.str("SHYear", education.SHYear),
        P.str("SHTrack", education.SHTrack),
        P.str("Awards", education.Awards),
        P.str("Scholar", education.Scholar),
        // --- Medical_Information ---
        P.bit("HasMedical", hasAny(medical)),
        P.dec("Height", medical.Height, 4, 2),
        P.dec("Weight", medical.Weight, 5, 2),
        P.bit("PWD", medical.PWD),
        P.str("Disability", medical.Disability),
        P.str("Chronic", medical.Chronic),
        // --- Other_Information ---
        P.bit("HasOther", hasAny(other)),
        P.str("Sinterest", other.Sinterest),
        P.str("Skill", other.Skill),
        P.str("Hobbies", other.Hobbies),
        P.str("Ambition", other.Ambition),
        P.str("Motto", other.Motto),
        // --- UserAccount ---
        P.str("Username", account.username),
        P.str("PasswordHash", passwordHash),
        P.str("Role", "student"),
      ]);

      res.json({
        status: "registered",
        genId: rows[0].GenID,
        studentNo: rows[0].StudentNo,
        username: account.username,
        message: "Your Pink Horizon Academy account has been created.",
      });
    } catch (err) {
      // 50001 = THROW in usp_Student_Apply for a duplicate username
      if (err.number === 50001 || String(err.message).includes("UQ_UserAccount_Username")) {
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

    const rows = await runProc("usp_User_Login", [P.str("Username", username)]);
    if (!rows.length) return res.status(401).json({ error: "Invalid username or password." });

    const acc = rows[0];
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
    const rows = await runProc("usp_Student_GetHome", [P.int("GenID", req.session.user.genId)]);
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
//  REGISTRAR ANALYTICS + STUDENT LIST
// ============================================================
app.get("/api/stats/summary", wrap(async (_req, res) => {
  const rows = await runProc("usp_Stats_Summary");
  res.json(rows[0]);
}));

app.get("/api/stats/by-program", wrap(async (_req, res) => res.json(await runProc("usp_Stats_ByProgram"))));
app.get("/api/stats/by-campus",  wrap(async (_req, res) => res.json(await runProc("usp_Stats_ByCampus"))));
app.get("/api/stats/by-sex",     wrap(async (_req, res) => res.json(await runProc("usp_Stats_BySex"))));
app.get("/api/stats/by-region",  wrap(async (_req, res) => res.json(await runProc("usp_Stats_ByRegion"))));
app.get("/api/stats/by-income",  wrap(async (_req, res) => res.json(await runProc("usp_Stats_ByIncome"))));

app.get("/api/students", wrap(async (req, res) => {
  const { search, programId, campusId, sexId } = req.query;
  // a missing filter is sent as NULL; the procedure skips NULL filters
  res.json(await runProc("usp_Student_Search", [
    P.str("Search", search),
    P.int("ProgramID", programId),
    P.int("CampusID", campusId),
    P.int("SexID", sexId),
  ]));
}));

app.get("/api/students/:id", wrap(async (req, res) => {
  // one procedure returns 9 result sets, always in the same order
  const [
    general, family, siblings, education, medical,
    medications, other, schoolOrgs, commOrgs,
  ] = await runProcMulti("usp_Student_GetDetail", [P.int("GenID", req.params.id)]);

  if (!general.length) return res.status(404).json({ error: "Student not found" });

  res.json({
    general: general[0],
    family: family[0] || null,
    siblings,
    education: education[0] || null,
    medical: medical[0] || null,
    medications,
    other: other[0] || null,
    schoolOrgs,
    commOrgs,
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