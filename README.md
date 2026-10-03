# Pink Horizon Academy — Online Application & Student Portal

A full web application for **Pink Horizon Academy**, backed by the **`PersonINFO`** SQL Server
database from the SQL laboratory activities. Students **apply online** (which INSERTs their
data across the database tables), get a **registered account**, **log in**, and land on an
**LMS-style student portal**. A **Registrar dashboard** provides analytics (charts) over all
applicant data.

```
  Apply  ──▶  Registered  ──▶  Login  ──▶  Student LMS
 (INSERTs)    (account made)  (bcrypt)   (own profile + classes)
```

---

## 1. Architecture

```
  Browser (public/)  ──HTTP──▶  Node.js + Express  ──ODBC──▶  SQL Server
                                (server.js + db.js)          PersonINFO
```

A browser cannot talk to SQL Server directly, so a small Node.js server runs the T-SQL and
returns JSON. Login sessions are kept server-side (express-session); passwords are hashed with
**bcrypt** and never stored in plain text.

---

## 2. One-time database setup (IMPORTANT)

The login feature needs a new table. Run this **once in SSMS** (it does not change any of your
existing tables — it only adds `UserAccount` and links it by foreign key to
`General_Information`):

```
sql/01_add_useraccount.sql
```

Open it in SSMS against the `PersonINFO` database and Execute.

---

## 3. Setup & run

Open a terminal **inside the `Pink-Horizon-Application-Form` folder**:

```powershell
npm install
npm start
```

You should see:

```
[db] Connected to localhost\SQLEXPRESS01 / PersonINFO (Windows auth)
  Pink Horizon Academy running:  http://localhost:3000
```

Open **http://localhost:3000**.

The connection settings live in `.env` (server `localhost`, instance `SQLEXPRESS01`,
database `PersonINFO`, Windows auth). See section 6 if it can't connect.

---

## 4. Demo script (for your defense)

1. **Landing page** → click **Start your application**.
2. **Apply** — fill the 5 steps (Personal, Family, Education, Health, Account). Only name,
   campus, program, and account username/password are strictly required; the rest is optional.
   Submitting runs a single **transaction** that INSERTs into `General_Information`,
   `Family_Background`, `Educational_Background`, `Medical_Information`, `Other_Information`,
   then creates the `UserAccount`.
3. **Registered** screen shows the auto-generated **Student No.** (e.g. `PHA-2026-00006`).
4. Click **Proceed to Login**, sign in with the account you just made.
5. **Student LMS** shows the student's own profile (pulled from the DB), announcements, and a
   sample class schedule based on their program.
6. Open the **Registrar** tab: the charts and student table now include the student you just
   created — proving the write reached the database.
7. (Optional) Confirm in **SSMS**: `SELECT * FROM General_Information;` and
   `SELECT * FROM UserAccount;` — the new rows are there, password stored as a bcrypt hash.

---

## 5. What each screen uses in SQL

| Screen | SQL involved |
|---|---|
| **Apply** | `INSERT` into 6 tables inside a `TRANSACTION`; `OUTPUT INSERTED.GenID` to link children to the parent; duplicate-username check. |
| **Login** | `SELECT` with `INNER JOIN UserAccount → General_Information`, then bcrypt hash compare. |
| **LMS Home** | `SELECT` with `LEFT JOIN`s to resolve Program / Campus / Semester / Academic Year names for the logged-in student. |
| **Registrar charts** | `GROUP BY` aggregations with `JOIN`s (per Program, Campus, Sex, Region, Income). |
| **Registrar table** | `INNER`/`LEFT JOIN` to show names instead of IDs; parameterized search + filters. |
| **Student detail** | Reads the full parent-child hierarchy (Family→Siblings, Medical→Medication, Extracurricular→Orgs). |

---

## 6. If it can't connect

Windows Authentication uses the `msnodesqlv8` driver + an ODBC driver.

- **Option A (keep Windows auth):** install *"ODBC Driver 17 for SQL Server"* from Microsoft, then `npm start` again.
- **Option B (SQL login):** in `.env` set `DB_AUTH=sql`, `DB_USER=...`, `DB_PASSWORD=...`, enable TCP/IP for `SQLEXPRESS01` and start the *SQL Server Browser* service.

Also check: the SQL Server (SQLEXPRESS01) service is running, and you ran
`sql/01_add_useraccount.sql`.

---

## 7. Files

```
Pink-Horizon-Application-Form/
├── .env                      ← DB + session settings
├── package.json
├── db.js                     ← SQL Server connection pool
├── server.js                 ← Express API: apply / login / lms / analytics
├── README.md
├── ERD.md                    ← ER diagram (now includes UserAccount)
├── DATA_DICTIONARY.md
├── sql/
│   └── 01_add_useraccount.sql ← RUN THIS ONCE in SSMS
└── public/
    ├── index.html            ← the single-page app (all screens)
    ├── styles.css            ← pink theme
    └── app.js                ← routing, form, login, LMS, dashboard
```

---

## 8. Security note (academic honesty)

For this **local school demo**, passwords are hashed with bcrypt but there is no HTTPS,
email verification, or rate limiting — those matter only if the app is deployed online. The
`.env` session secret and DB credentials are development values.I designed the PersonINFO schema and seed data. AI assistance was used for the Node.js
web layer and the LMS tables; I reviewed and can explain every query.
```
