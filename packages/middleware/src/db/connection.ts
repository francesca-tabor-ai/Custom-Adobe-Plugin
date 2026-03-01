import initSqlJs, { type Database } from "sql.js";
import * as path from "path";
import * as fs from "fs";
import { config } from "../config";

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let brandDb: Database | null = null;
let auditDb: Database | null = null;

async function ensureSqlJs(): Promise<void> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
}

/**
 * Open a read-only connection to the existing brand data SQLite database.
 * Uses sql.js (pure JS SQLite compiled from C to WASM).
 */
export async function getBrandDb(): Promise<Database> {
  if (brandDb) return brandDb;

  await ensureSqlJs();

  if (!fs.existsSync(config.databasePath)) {
    throw new Error(`Brand database not found at: ${config.databasePath}`);
  }

  const buffer = fs.readFileSync(config.databasePath);
  brandDb = new SQL!.Database(buffer);

  return brandDb;
}

/**
 * Reload the brand database from disk (picks up changes from Python sync).
 */
export async function reloadBrandDb(): Promise<Database> {
  if (brandDb) {
    brandDb.close();
    brandDb = null;
  }
  return getBrandDb();
}

/**
 * Open a read-write connection to the audit SQLite database.
 * Creates the database and tables if they don't exist.
 */
export async function getAuditDb(): Promise<Database> {
  if (auditDb) return auditDb;

  await ensureSqlJs();

  const dir = path.dirname(config.auditDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(config.auditDbPath)) {
    const buffer = fs.readFileSync(config.auditDbPath);
    auditDb = new SQL!.Database(buffer);
  } else {
    auditDb = new SQL!.Database();
  }

  auditDb.run(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      brand_id TEXT,
      user_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      app_name TEXT,
      app_version TEXT,
      plugin_version TEXT,
      document_name TEXT,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  saveAuditDb();
  return auditDb;
}

/** Persist the audit database to disk. */
export function saveAuditDb(): void {
  if (!auditDb) return;
  const data = auditDb.export();
  fs.writeFileSync(config.auditDbPath, Buffer.from(data));
}

/** Close all database connections (for graceful shutdown). */
export function closeAll(): void {
  if (brandDb) {
    brandDb.close();
    brandDb = null;
  }
  if (auditDb) {
    saveAuditDb();
    auditDb.close();
    auditDb = null;
  }
}

// ── Query helpers ─────────────────────────────────────────────────────

export interface Row {
  [key: string]: unknown;
}

/**
 * Run a SELECT query and return all rows as plain objects.
 */
export function queryAll(db: Database, sql: string, params: unknown[] = []): Row[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const results: Row[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as Row);
  }
  stmt.free();
  return results;
}

/**
 * Run a SELECT query and return the first row, or undefined.
 */
export function queryOne(db: Database, sql: string, params: unknown[] = []): Row | undefined {
  const rows = queryAll(db, sql, params);
  return rows[0];
}

/**
 * Run an INSERT/UPDATE/DELETE statement.
 */
export function execStmt(db: Database, sql: string, params: unknown[] = []): void {
  if (params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  } else {
    db.run(sql);
  }
}
