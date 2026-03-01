import initSqlJs, { type Database } from "sql.js";
import { buildBrandPayload } from "../services/brand-payload-builder";

let db: Database;

function insert(sql: string, params: unknown[]): void {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
}

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  // Create tables matching models.py schemas
  db.run(`
    CREATE TABLE brands (
      brand_id TEXT PRIMARY KEY, name TEXT, brand_guidelines_url TEXT,
      airtable_record_id TEXT, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE design_tokens (
      token_id TEXT PRIMARY KEY, type TEXT, name TEXT, value TEXT, brand TEXT, notes TEXT,
      airtable_record_id TEXT, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE assets_library (
      asset_id TEXT PRIMARY KEY, asset_type TEXT, dam_url TEXT, brand TEXT,
      usage_rights TEXT, allowed_markets TEXT, status TEXT, tags TEXT,
      airtable_record_id TEXT, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE disclaimers_library (
      disclaimer_id TEXT PRIMARY KEY, disclaimer_text TEXT, disclaimer_type TEXT,
      market_locales TEXT, disclaimer_version TEXT, status TEXT, valid_from TEXT, valid_to TEXT,
      airtable_record_id TEXT, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE claims_library (
      claim_id TEXT PRIMARY KEY, claim_text TEXT, claim_category TEXT,
      requires_disclaimer TEXT, allowed_markets TEXT, status TEXT, valid_from TEXT, valid_to TEXT,
      evidence_url TEXT,
      airtable_record_id TEXT, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE markets_locales (
      locale_id TEXT PRIMARY KEY, market TEXT, language TEXT,
      currency_format TEXT, unit_system TEXT, rtl TEXT, legal_regime TEXT,
      airtable_record_id TEXT, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE _sync_meta (
      table_name TEXT PRIMARY KEY, last_pull_at TEXT, last_push_at TEXT, airtable_cursor TEXT
    )
  `);

  const now = new Date().toISOString();

  // Insert test data
  insert("INSERT INTO brands VALUES (?, ?, NULL, NULL, ?, 0)", ["BRD-001", "Test Brand", now]);
  insert("INSERT INTO design_tokens VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0)", [
    "TKN-C001", "color", "Primary Blue", "#1A73E8", "BRD-001", "primary", now,
  ]);
  insert("INSERT INTO design_tokens VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0)", [
    "TKN-T001", "typography", "Heading",
    '{"fontFamily":"Inter","fontWeight":"700","fontSize":"32px","lineHeight":"1.2"}',
    "BRD-001", "heading", now,
  ]);
  insert("INSERT INTO assets_library VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0)", [
    "AST-L001", "logo_primary", "https://dam.example.com/logo.svg", "BRD-001",
    "internal", '["US"]', "active", '["logo"]', now,
  ]);
  insert("INSERT INTO disclaimers_library VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 0)", [
    "DSC-001", "Results may vary.", "health", '["US"]', "1", "active", "2024-01-01", now,
  ]);
  insert("INSERT INTO claims_library VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 0)", [
    "CLM-001", "Clinically proven", "product_benefit", "DSC-001", '["US"]', "active", "2024-01-01", now,
  ]);
  insert("INSERT INTO markets_locales VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, 0)", [
    "LOC-US-EN", "US", "en", "USD", "imperial", "FDA", now,
  ]);
  insert("INSERT INTO _sync_meta VALUES (?, ?, NULL, NULL)", ["brands", now]);

  // Insert a soft-deleted brand to verify filtering
  insert("INSERT INTO brands VALUES (?, ?, NULL, NULL, ?, 1)", ["BRD-DEL", "Deleted Brand", now]);
});

afterAll(() => {
  db.close();
});

describe("buildBrandPayload", () => {
  test("returns null for unknown brand", () => {
    const result = buildBrandPayload(db, "NONEXISTENT");
    expect(result).toBeNull();
  });

  test("returns null for soft-deleted brand", () => {
    const result = buildBrandPayload(db, "BRD-DEL");
    expect(result).toBeNull();
  });

  test("builds complete payload for valid brand", () => {
    const payload = buildBrandPayload(db, "BRD-001");

    expect(payload).not.toBeNull();
    expect(payload!.meta.brandId).toBe("BRD-001");
    expect(payload!.meta.brandName).toBe("Test Brand");
    expect(payload!.meta.payloadVersion).toMatch(/^[a-f0-9]{16}$/);
    expect(payload!.meta.generatedAt).toBeTruthy();
  });

  test("maps color tokens to swatches correctly", () => {
    const payload = buildBrandPayload(db, "BRD-001")!;

    expect(payload.swatches).toHaveLength(1);
    expect(payload.swatches[0]).toEqual({
      tokenId: "TKN-C001",
      name: "Primary Blue",
      hexValue: "#1A73E8",
      role: "primary",
      rgb: { r: 26, g: 115, b: 232 },
    });
  });

  test("maps typography tokens correctly", () => {
    const payload = buildBrandPayload(db, "BRD-001")!;

    expect(payload.typography).toHaveLength(1);
    expect(payload.typography[0].fontFamily).toBe("Inter");
    expect(payload.typography[0].fontWeight).toBe("700");
  });

  test("maps logo assets correctly", () => {
    const payload = buildBrandPayload(db, "BRD-001")!;

    expect(payload.logos).toHaveLength(1);
    expect(payload.logos[0].assetId).toBe("AST-L001");
    expect(payload.logos[0].assetType).toBe("logo_primary");
    expect(payload.logos[0].allowedMarkets).toEqual(["US"]);
  });

  test("includes disclaimers, claims, and markets", () => {
    const payload = buildBrandPayload(db, "BRD-001")!;

    expect(payload.disclaimers).toHaveLength(1);
    expect(payload.claims).toHaveLength(1);
    expect(payload.markets).toHaveLength(1);
  });

  test("payload version is deterministic", () => {
    const p1 = buildBrandPayload(db, "BRD-001")!;
    const p2 = buildBrandPayload(db, "BRD-001")!;

    expect(p1.meta.payloadVersion).toBe(p2.meta.payloadVersion);
  });

  test("data version counts are correct", () => {
    const payload = buildBrandPayload(db, "BRD-001")!;

    expect(payload.meta.dataVersion.tokensCount).toBe(2); // 1 color + 1 typography
    expect(payload.meta.dataVersion.assetsCount).toBe(1);
    expect(payload.meta.dataVersion.disclaimersCount).toBe(1);
    expect(payload.meta.dataVersion.syncedAt).toBeTruthy();
  });
});
