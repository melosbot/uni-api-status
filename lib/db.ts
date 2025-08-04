import sqlite3 from "sqlite3";
import { Pool } from "pg";
import { promisify } from "util";

const dbType = process.env.STATS_DB_TYPE || "sqlite";

let db: any;
let query: any;

if (dbType === "postgres") {
  const pool = new Pool({
    user: process.env.STATS_DB_USER,
    host: process.env.STATS_DB_HOST,
    database: process.env.STATS_DB_NAME,
    password: process.env.STATS_DB_PASSWORD,
    port: parseInt(process.env.STATS_DB_PORT || "5432", 10),
  });

  db = pool;
  query = async (sql: string, params: any[] = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  };
} else {
  const dbPath = process.env.STATS_DB_PATH || "./data/stats.db";
  const sqlite = new sqlite3.Database(dbPath);
  db = sqlite;

  const all = promisify((sql: string, params: any[], callback: (err: Error | null, rows: any[]) => void) =>
    sqlite.all(sql, params, callback)
  );
  const run = promisify((sql: string, params: any[], callback: (err: Error | null) => void) =>
    sqlite.run(sql, params, callback)
  );

  query = async (sql: string, params: any[] = []) => {
    // Replace $1, $2, etc. with ? for SQLite
    const sqliteSql = sql.replace(/\$\d+/g, "?");
    return await all(sqliteSql, params);
  };
}

export { db, query };