# Pink Horizon Academy — Online Application & Student Portal

A full web application for **Pink Horizon Academy**, backed by the **`PersonINFO`** SQL Server
database from the SQL laboratory activities. Students **apply online** (which INSERTs their
data across the database tables), get a **registered account**, **log in**, and land on an
**LMS-style student portal**. A **Registrar dashboard** provides analytics (charts) over all
applicant data.

**All database access goes through stored procedures** (`usp_...`). The front end never touches
a table, and `server.js` contains no SQL — it only calls `runProc("usp_...")` with parameters.

```
  Apply  ──▶  Registered  ──▶  Login  ──▶  Student LMS
 (INSERTs)    (account made)  (bcrypt)   (own profile + classes)
```

---

## 1. Architecture

```
  Browser (public/)  ──HTTP──▶  Node.js + Express  ──ODBC──▶  SQL Server
   (no SQL here)                (server.js + db.js)          PersonINFO
                                 runProc("usp_...")          stored procedures → tables
```

A browser cannot talk to SQL Server directly, so a small Node.js server receives each request
and executes a **parameterized stored procedure**. The procedure runs the actual
`SELECT / INSERT / UPDATE / DELETE` inside SQL Server and the result goes back as JSON.
Login sessions are kept server-side (express-session); passwords are hashed with **bcrypt**
in Node, so the database only ever stores the hash.

---

## 2. One-time database setup (IMPORTANT)

In **SSMS**, create the `PersonINFO` database, then run these scripts **in this order**
(select `PersonINFO` as the active database first):

| Order | Script | What it does |
|---|---|---|
| 1 | `PersonalInfo.sql` | Base schema (lookup tables + `General_Information` + detail tables) |
| 2 | `sql/01_add_useraccount.sql` | Adds `UserAccount` (login), linked to `General_Information` |
| 3 | `sql/02_lms_tables.sql` | Adds the LMS tables (Course, Section, Enrollment, Grade, StudentProfile) |
| 4 | `sql/03_admin_account.sql` | Creates the admin account |
| 5 | `sql/04_update_programs.sql` | Loads the real program list |
| 6 | `sql/05_stored_procedures.sql` | **Creates all stored procedures the app calls** |

Script 05 uses `CREATE OR ALTER`, so it is safe to run again.

---

## 3. Setup & run

Create a `.env` file in the project folder (it is **not** committed to Git):

```
DB_SERVER=.
DB_INSTANCE=SQLEXPRESS01
DB_DATABASE=PersonINFO
DB_AUTH=windows
PORT=3000
SESSION_SECRET=any-long-random-text
```

Then open a terminal **inside the `Pink-Horizon-Application-Form` folder**:

```powershell
npm install
npm start
```

You should see:

```
[db] Connected to .\SQLEXPRESS01 / PersonINFO (Windows auth)
  Pink Horizon Academy running:  http://localhost:3000
```

Open **http://localhost:3000**. See section 6 if it can't connect.

---

## 4. Demo script (for your defense)

1. **Landing page** → click **Start your application**.
2. **Apply** — fill the 5 steps (Personal, Family, Education, Health, Account). Only name,
   campus, program, and account username/password are strictly required; the rest is optional.
   Submitting calls **`usp_Student_Apply`**, which runs a single **transaction inside SQL Server**
   that INSERTs into `General_Information`, `Family_Background`, `Educational_Background`,
   `Medical_Information`, `Other_Information`, then creates the `UserAccount`
   (all-or-nothing: any error rolls everything back).
3. **Registered** screen shows the auto-generated **Student No.** (e.g. `PHA-2026-00006`).
4. Click **Proceed to Login**, sign in with the account you just made.
5. **Student LMS** shows the student's own profile (pulled from the DB), announcements, and a
   sample class schedule based on their program.
6. Open the **Registrar** tab: the charts and student table now include the student you just
   created — proving the write reached the database.
7. Confirm in **SSMS**:
   ```sql
   SELECT TOP 1 * FROM General_Information ORDER BY GenID DESC;
   SELECT UserID, GenID, Username, Role FROM UserAccount ORDER BY UserID DESC;  -- hash, not the password
   EXEC usp_Student_Search @Search = 'cruz';
   ```
8. Prove it is stored procedures only: search `server.js` for `SELECT` / `INSERT` (no results);
   everything is `runProc(...)`.

---

## 5. What each screen uses in SQL

| Screen | Stored procedure | SQL involved |
|---|---|---|
| **Form dropdowns** | `usp_Lookup_Get @Type` | `SELECT` from the 12 lookup tables |
| **Apply** | `usp_Student_Apply` | `INSERT` into 6 tables in a `TRANSACTION`; `SCOPE_IDENTITY()` links children to the parent; duplicate-username check (`THROW 50001`) |
| **Login** | `usp_User_Login @Username` | `INNER JOIN UserAccount → General_Information`; bcrypt compare happens in Node |
| **LMS Home** | `usp_Student_GetHome @GenID` | `LEFT JOIN`s to resolve Program / Campus / Semester / Academic Year names |
| **Registrar charts** | `usp_Stats_Summary`, `usp_Stats_ByProgram / ByCampus / BySex / ByRegion / ByIncome` | `GROUP BY` aggregations with `JOIN`s |
| **Registrar table** | `usp_Student_Search @Search, @ProgramID, @CampusID, @SexID` | `INNER`/`LEFT JOIN`; optional filters (`@X IS NULL OR col = @X`) |
| **Student detail** | `usp_Student_GetDetail @GenID` | 9 result sets: parent-child hierarchy (Family→Siblings, Medical→Medication, Extracurricular→Orgs) |
| **Health check** | `usp_Health_Check` | `DB_NAME()`, `SUSER_SNAME()` |

---

## 6. If it can't connect

Windows Authentication uses the `msnodesqlv8` driver + an ODBC driver.

- **Option A (keep Windows auth):** install *"ODBC Driver 17 for SQL Server"* from Microsoft, then `npm start` again.
- **Option B (SQL login):** in `.env` set `DB_AUTH=sql`, `DB_USER=...`, `DB_PASSWORD=...`, enable TCP/IP for `SQLEXPRESS01` and start the *SQL Server Browser* service.

Also check: the SQL Server (SQLEXPRESS01) service is running, `DB_INSTANCE` matches your own
instance name, and you ran **all** scripts in section 2 (a missing one shows up as
`Invalid object name` or `Could not find stored procedure`).

---

## 7. Files

```
Pink-Horizon-Application-Form/
├── .env                      ← DB + session settings (NOT in Git; create it yourself)
├── package.json
├── db.js                     ← SQL Server connection pool + runProc / runProcMulti
├── server.js                 ← Express API: calls stored procedures only
├── README.md
├── ERD.md                    ← ER diagram
├── DATA_DICTIONARY.md
├── sql/
│   ├── 01_add_useraccount.sql
│   ├── 02_lms_tables.sql
│   ├── 03_admin_account.sql
│   ├── 04_update_programs.sql
│   └── 05_stored_procedures.sql ← all usp_ procedures the app calls
└── public/
    ├── index.html            ← the single-page app (all screens)
    ├── styles.css            ← pink theme
    └── app.js                ← routing, form, login, LMS, dashboard
```

---

## 8. Security & academic honesty note

For this **local school demo**, passwords are hashed with bcrypt but there is no HTTPS,
email verification, or rate limiting — those matter only if the app is deployed online. The
`.env` session secret and DB credentials are development values and are kept out of Git.

**AI disclosure:** I designed the `PersonINFO` schema and seed data. AI assistance
(Kiro and Claude) was used for the Node.js web layer, the LMS tables, and converting the SQL
into stored procedures. I reviewed the code and can explain each stored procedure.
