/**
 * Seed script — populates the SQLite database with sample brand data for development.
 *
 * Creates the same table schemas used by the Python data-sync service (models.py),
 * then inserts 2 sample brands with design tokens, assets, disclaimers, claims, and markets.
 *
 * Usage: npx ts-node scripts/seed-db.ts
 */

import initSqlJs from "sql.js";
import * as path from "path";
import * as fs from "fs";

const DB_PATH = path.resolve(__dirname, "..", "data", "brand-seed.sqlite");

async function seed() {
  // Ensure data directory exists
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  // Remove old seed DB if exists
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const now = new Date().toISOString();

  // ── Create tables (matching models.py schemas) ────────────────────────

  db.run(`
    CREATE TABLE IF NOT EXISTS brands (
      brand_id TEXT PRIMARY KEY, name TEXT, brand_guidelines_url TEXT,
      airtable_record_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS design_tokens (
      token_id TEXT PRIMARY KEY, type TEXT, name TEXT, value TEXT, brand TEXT, notes TEXT,
      airtable_record_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS assets_library (
      asset_id TEXT PRIMARY KEY, asset_type TEXT, dam_url TEXT, brand TEXT,
      usage_rights TEXT, allowed_markets TEXT, status TEXT, tags TEXT,
      airtable_record_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS disclaimers_library (
      disclaimer_id TEXT PRIMARY KEY, disclaimer_text TEXT, disclaimer_type TEXT,
      market_locales TEXT, disclaimer_version TEXT, status TEXT, valid_from TEXT, valid_to TEXT,
      airtable_record_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS claims_library (
      claim_id TEXT PRIMARY KEY, claim_text TEXT, claim_category TEXT,
      requires_disclaimer TEXT, allowed_markets TEXT, status TEXT, valid_from TEXT, valid_to TEXT,
      evidence_url TEXT, airtable_record_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS markets_locales (
      locale_id TEXT PRIMARY KEY, market TEXT, language TEXT,
      currency_format TEXT, unit_system TEXT, rtl TEXT, legal_regime TEXT,
      airtable_record_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS _sync_meta (
      table_name TEXT PRIMARY KEY, last_pull_at TEXT, last_push_at TEXT, airtable_cursor TEXT
    )
  `);

  // ── Seed data ─────────────────────────────────────────────────────────

  function insert(sql: string, params: unknown[]): void {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  }

  // Brands
  insert("INSERT INTO brands (brand_id, name, updated_at) VALUES (?, ?, ?)", ["BRD-001", "Acme Corporation", now]);
  insert("INSERT INTO brands (brand_id, name, updated_at) VALUES (?, ?, ?)", ["BRD-002", "Horizon Health", now]);

  // Design Tokens — Colors
  const tokenSql = "INSERT INTO design_tokens (token_id, type, name, value, brand, notes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const colorTokens = [
    ["TKN-C001", "color", "Acme Blue",       "#1A73E8", "BRD-001", "primary"],
    ["TKN-C002", "color", "Acme Navy",       "#0D47A1", "BRD-001", "secondary"],
    ["TKN-C003", "color", "Acme Coral",      "#FF6B6B", "BRD-001", "accent"],
    ["TKN-C004", "color", "Acme Light Gray", "#F5F5F5", "BRD-001", "background"],
    ["TKN-C005", "color", "Horizon Green",   "#00C853", "BRD-002", "primary"],
    ["TKN-C006", "color", "Horizon Teal",    "#009688", "BRD-002", "secondary"],
    ["TKN-C007", "color", "Horizon Amber",   "#FFB300", "BRD-002", "accent"],
    ["TKN-C008", "color", "Horizon White",   "#FFFFFF", "BRD-002", "background"],
  ];
  for (const [id, type, name, value, brand, notes] of colorTokens) {
    insert(tokenSql, [id, type, name, value, brand, notes, now]);
  }

  // Design Tokens — Typography
  const typoTokens = [
    ["TKN-T001", "typography", "Acme Heading", JSON.stringify({ fontFamily: "Inter", fontWeight: "700", fontSize: "32px", lineHeight: "1.2" }), "BRD-001", "heading"],
    ["TKN-T002", "typography", "Acme Body", JSON.stringify({ fontFamily: "Inter", fontWeight: "400", fontSize: "16px", lineHeight: "1.5" }), "BRD-001", "body"],
    ["TKN-T003", "typography", "Horizon Heading", JSON.stringify({ fontFamily: "Poppins", fontWeight: "600", fontSize: "28px", lineHeight: "1.3" }), "BRD-002", "heading"],
    ["TKN-T004", "typography", "Horizon Body", JSON.stringify({ fontFamily: "Open Sans", fontWeight: "400", fontSize: "14px", lineHeight: "1.6" }), "BRD-002", "body"],
  ];
  for (const [id, type, name, value, brand, notes] of typoTokens) {
    insert(tokenSql, [id, type, name, value, brand, notes, now]);
  }

  // Assets — Logos
  const assetSql = "INSERT INTO assets_library (asset_id, asset_type, dam_url, brand, usage_rights, allowed_markets, status, tags, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const logos = [
    ["AST-L001", "logo_primary",   "https://dam.example.com/acme/logo-primary.svg",   "BRD-001", "internal", '["US","UK","DE"]', "active", '["logo","primary","horizontal"]'],
    ["AST-L002", "logo_mono",      "https://dam.example.com/acme/logo-mono.svg",      "BRD-001", "internal", '["US","UK","DE"]', "active", '["logo","monochrome"]'],
    ["AST-L003", "logo_primary",   "https://dam.example.com/horizon/logo-primary.svg", "BRD-002", "internal", '["US","UK"]',      "active", '["logo","primary","horizontal"]'],
    ["AST-L004", "logo_secondary", "https://dam.example.com/horizon/logo-stacked.svg", "BRD-002", "internal", '["US","UK"]',      "active", '["logo","secondary","stacked"]'],
  ];
  for (const [id, type, url, brand, rights, markets, status, tags] of logos) {
    insert(assetSql, [id, type, url, brand, rights, markets, status, tags, now]);
  }

  // Disclaimers
  const disclaimerSql = "INSERT INTO disclaimers_library (disclaimer_id, disclaimer_text, disclaimer_type, market_locales, disclaimer_version, status, valid_from, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  const disclaimers = [
    ["DSC-001", "Results may vary. This product is not intended to diagnose, treat, cure, or prevent any disease.", "health", '["US"]', "1", "active", "2024-01-01"],
    ["DSC-002", "Terms and conditions apply. See website for full details.", "general", '["US","UK","DE"]', "2", "active", "2024-01-01"],
    ["DSC-003", "Dieses Produkt ist nicht zur Diagnose, Behandlung, Heilung oder Vorbeugung von Krankheiten bestimmt.", "health", '["DE"]', "1", "active", "2024-01-01"],
  ];
  for (const [id, text, type, locales, version, status, validFrom] of disclaimers) {
    insert(disclaimerSql, [id, text, type, locales, version, status, validFrom, now]);
  }

  // Claims
  const claimSql = "INSERT INTO claims_library (claim_id, claim_text, claim_category, requires_disclaimer, allowed_markets, status, valid_from, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  const claims = [
    ["CLM-001", "Clinically proven to improve results by 40%", "product_benefit", "DSC-001", '["US"]', "active", "2024-01-01"],
    ["CLM-002", "#1 recommended brand by professionals", "comparative", "DSC-002", '["US","UK"]', "active", "2024-01-01"],
    ["CLM-003", "Made with 100% natural ingredients", "environmental", "", '["US","UK","DE"]', "active", "2024-01-01"],
  ];
  for (const [id, text, category, disclaimer, markets, status, validFrom] of claims) {
    insert(claimSql, [id, text, category, disclaimer, markets, status, validFrom, now]);
  }

  // Markets / Locales
  const marketSql = "INSERT INTO markets_locales (locale_id, market, language, currency_format, unit_system, legal_regime, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const markets = [
    ["LOC-US-EN", "US", "en", "USD", "imperial", "FDA"],
    ["LOC-UK-EN", "UK", "en", "GBP", "metric", "MHRA"],
  ];
  for (const [id, market, lang, currency, unit, legal] of markets) {
    insert(marketSql, [id, market, lang, currency, unit, legal, now]);
  }

  // Sync meta
  insert("INSERT INTO _sync_meta (table_name, last_pull_at) VALUES (?, ?)", ["brands", now]);

  // Export to file
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`Seed database created at: ${DB_PATH}`);
  console.log(`  2 brands, 12 design tokens, 4 logo assets, 3 disclaimers, 3 claims, 2 markets`);
  console.log(`\nTo use this as your DATABASE_PATH, set in .env:`);
  console.log(`  DATABASE_PATH=./data/brand-seed.sqlite`);
}

seed().catch(console.error);
