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
 * Run a query against the pool.
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

module.exports = { sql, poolPromise, runQuery };
