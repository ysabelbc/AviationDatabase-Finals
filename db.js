// ============================================================
//  db.js  —  SQL Server connection for the PersonINFO database
//
//  Supports two auth modes (set DB_AUTH in .env):
//    - windows : Windows Authentication (trusted connection),
//                the same "<default>" login you use in SSMS.
//                Uses the msnodesqlv8 driver.
//    - sql     : SQL Server login (username + password).
//                Uses the default tedious driver.
//
//  One shared connection pool is reused for every request.
//
//  Two helpers are exported:
//    - runProc(name, params)   -> executes a STORED PROCEDURE (use this)
//    - runProcMulti(name, ps)  -> same, for procedures with several result sets
//    - runQuery(query, params) -> runs inline T-SQL (old way; remove once
//                                 every route has been moved to a procedure)
// ============================================================

require("dotenv").config();

const AUTH = (process.env.DB_AUTH || "windows").toLowerCase();

const SERVER = process.env.DB_SERVER || "localhost";
const INSTANCE = process.env.DB_INSTANCE || "";
const DATABASE = process.env.DB_DATABASE || "PersonINFO";
const DB_USER = process.env.DB_USER || "";
const DB_PASSWORD = process.env.DB_PASSWORD || "";

let sql;
let poolPromise;

if (AUTH === "windows") {
  // Windows Authentication -> msnodesqlv8 driver + a connection string.
  sql = require("mssql/msnodesqlv8");

  // Build "server\instance" or just "server".
  const serverPart = INSTANCE ? `${SERVER}\\${INSTANCE}` : SERVER;

  const connectionString =
    `Driver={ODBC Driver 17 for SQL Server};` +
    `Server=${serverPart};` +
    `Database=${DATABASE};` +
    `Trusted_Connection=Yes;`;

  const config = {
    connectionString,
    options: { trustServerCertificate: true },
  };

  poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      console.log(`[db] Connected to ${serverPart} / ${DATABASE} (Windows auth)`);
      return pool;
    })
    .catch((err) => {
      console.error("[db] Windows-auth connection FAILED:", err.message);
      throw err;
    });
} else {
  // SQL Server login -> default tedious driver.
  sql = require("mssql");

  const config = {
    user: DB_USER,
    password: DB_PASSWORD,
    server: SERVER,
    database: DATABASE,
    options: {
      instanceName: INSTANCE || undefined,
      encrypt: false,
      trustServerCertificate: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };

  poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      console.log(
        `[db] Connected to ${SERVER}${INSTANCE ? "\\" + INSTANCE : ""} / ${DATABASE} (SQL auth)`
      );
      return pool;
    })
    .catch((err) => {
      console.error("[db] SQL-auth connection FAILED:", err.message);
      throw err;
    });
}

/**
 * Execute a STORED PROCEDURE on the pool.
 * The front end never touches a table: server.js calls this, and the
 * procedure inside SQL Server does the actual SELECT/INSERT/UPDATE/DELETE.
 *
 * @param {string} procName - e.g. "usp_Section_Insert"
 * @param {Array<{name:string, value:any}>} params - procedure parameters
 *        (name WITHOUT the @, must match the procedure's parameter names)
 * @returns {Promise<Array>} the first result set (rows), or [] if none
 *
 * Example:
 *   const rows = await runProc("usp_User_GetByUsername",
 *                              [{ name: "Username", value: "msantos" }]);
 */
async function runProc(procName, params = []) {
  const result = await execProc(procName, params);
  return result.recordset || [];
}

/**
 * Same as runProc, but for procedures that return SEVERAL result sets
 * (e.g. usp_Student_GetDetail). Returns an array of row-arrays.
 */
async function runProcMulti(procName, params = []) {
  const result = await execProc(procName, params);
  return result.recordsets || [];
}

// shared by runProc / runProcMulti
// A param may carry an optional SQL type: { name, type: sql.Int, value }
async function execProc(procName, params) {
  const pool = await poolPromise;
  const request = pool.request();
  for (const p of params) {
    if (p.type) request.input(p.name, p.type, p.value);
    else request.input(p.name, p.value);
  }
  return request.execute(procName); // .execute = call stored proc
}

/**
 * Run inline T-SQL against the pool (the OLD way).
 * Kept so existing routes keep working while you convert them to
 * stored procedures one by one. Delete it when nothing uses it.
 *
 * @param {string} query - T-SQL text (may contain @params)
 * @param {Array<{name:string, value:any}>} params - optional inputs
 */
async function runQuery(query, params = []) {
  const pool = await poolPromise;
  const request = pool.request();
  for (const p of params) {
    request.input(p.name, p.value);
  }
  const result = await request.query(query);
  return result.recordset;
}

module.exports = { sql, poolPromise, runProc, runProcMulti, runQuery };