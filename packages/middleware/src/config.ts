import * as path from "path";
import * as dotenv from "dotenv";

// Load .env from middleware package root
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
// Also try the monorepo root
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

const MIDDLEWARE_ROOT = path.resolve(__dirname, "..");

export const config = {
  /** Read-only path to the existing SQLite database from the Python data-sync service */
  databasePath: path.resolve(
    MIDDLEWARE_ROOT,
    process.env.DATABASE_PATH || "../../Adobe-Templatization/data-sync/data/database.sqlite"
  ),

  /** Directory where attachment_sync downloads asset files */
  assetDir: path.resolve(
    MIDDLEWARE_ROOT,
    process.env.ASSET_DIR || "../../Adobe-Templatization/data-sync/data/assets"
  ),

  /** Separate SQLite database for audit events */
  auditDbPath: path.resolve(
    MIDDLEWARE_ROOT,
    process.env.AUDIT_DB_PATH || "./data/audit.sqlite"
  ),

  /** JWT signing secret */
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",

  /** JWT expiry in minutes */
  jwtExpiryMinutes: parseInt(process.env.JWT_EXPIRY_MINUTES || "480", 10),

  /** Shared secret for v1 auth */
  sharedSecret: process.env.SHARED_SECRET || "dev-password",

  /** Comma-separated list of allowed user emails */
  allowedUsers: (process.env.ALLOWED_USERS || "designer@company.com").split(",").map((e) => e.trim()),

  /** Server port */
  port: parseInt(process.env.PORT || "3200", 10),

  /** Server host */
  host: process.env.HOST || "127.0.0.1",
};
