/**
 * SQL read queries against the existing brand data SQLite database.
 *
 * Column names match the schemas in:
 *   Adobe-Templatization/data-sync/app/models.py
 *
 * All queries filter soft-deleted rows (deleted = 0).
 * Uses sql.js query helpers from connection.ts.
 */

import type { Database } from "sql.js";
import { queryAll, queryOne, type Row } from "./connection";

// ── Brands ────────────────────────────────────────────────────────────

export interface BrandRow {
  brand_id: string;
  name: string;
  brand_guidelines_url: string | null;
  updated_at: string;
}

export function getBrands(db: Database): BrandRow[] {
  return queryAll(db, "SELECT * FROM brands WHERE deleted = 0") as unknown as BrandRow[];
}

export function getBrandById(db: Database, brandId: string): BrandRow | undefined {
  return queryOne(
    db,
    "SELECT * FROM brands WHERE brand_id = ? AND deleted = 0",
    [brandId]
  ) as unknown as BrandRow | undefined;
}

// ── Design Tokens ─────────────────────────────────────────────────────

export interface DesignTokenRow {
  token_id: string;
  type: string;
  name: string;
  value: string;
  brand: string;
  notes: string | null;
  updated_at: string;
}

export function getDesignTokensByBrand(
  db: Database,
  brandId: string,
  tokenType?: string
): DesignTokenRow[] {
  if (tokenType) {
    return queryAll(
      db,
      "SELECT * FROM design_tokens WHERE brand = ? AND type = ? AND deleted = 0",
      [brandId, tokenType]
    ) as unknown as DesignTokenRow[];
  }
  return queryAll(
    db,
    "SELECT * FROM design_tokens WHERE brand = ? AND deleted = 0",
    [brandId]
  ) as unknown as DesignTokenRow[];
}

// ── Assets Library ────────────────────────────────────────────────────

export interface AssetRow {
  asset_id: string;
  asset_type: string;
  dam_url: string | null;
  brand: string;
  usage_rights: string | null;
  allowed_markets: string | null;
  status: string | null;
  tags: string | null;
  updated_at: string;
}

export function getAssetsByBrand(
  db: Database,
  brandId: string,
  assetTypePrefix?: string
): AssetRow[] {
  if (assetTypePrefix) {
    return queryAll(
      db,
      "SELECT * FROM assets_library WHERE brand = ? AND asset_type LIKE ? AND deleted = 0",
      [brandId, `${assetTypePrefix}%`]
    ) as unknown as AssetRow[];
  }
  return queryAll(
    db,
    "SELECT * FROM assets_library WHERE brand = ? AND deleted = 0",
    [brandId]
  ) as unknown as AssetRow[];
}

export function getAssetById(db: Database, assetId: string): AssetRow | undefined {
  return queryOne(
    db,
    "SELECT * FROM assets_library WHERE asset_id = ? AND deleted = 0",
    [assetId]
  ) as unknown as AssetRow | undefined;
}

// ── Disclaimers ───────────────────────────────────────────────────────

export interface DisclaimerRow {
  disclaimer_id: string;
  disclaimer_text: string | null;
  disclaimer_type: string | null;
  market_locales: string | null;
  disclaimer_version: string | null;
  status: string | null;
  valid_from: string | null;
  valid_to: string | null;
  updated_at: string;
}

export function getDisclaimers(db: Database): DisclaimerRow[] {
  return queryAll(
    db,
    "SELECT * FROM disclaimers_library WHERE deleted = 0 AND status = 'active'"
  ) as unknown as DisclaimerRow[];
}

// ── Claims ────────────────────────────────────────────────────────────

export interface ClaimRow {
  claim_id: string;
  claim_text: string | null;
  claim_category: string | null;
  requires_disclaimer: string | null;
  allowed_markets: string | null;
  status: string | null;
  valid_from: string | null;
  valid_to: string | null;
  updated_at: string;
}

export function getClaims(db: Database): ClaimRow[] {
  return queryAll(
    db,
    "SELECT * FROM claims_library WHERE deleted = 0 AND status = 'active'"
  ) as unknown as ClaimRow[];
}

// ── Markets / Locales ─────────────────────────────────────────────────

export interface MarketLocaleRow {
  locale_id: string;
  market: string | null;
  language: string | null;
  currency_format: string | null;
  unit_system: string | null;
  rtl: string | null;
  legal_regime: string | null;
  updated_at: string;
}

export function getMarkets(db: Database): MarketLocaleRow[] {
  return queryAll(
    db,
    "SELECT * FROM markets_locales WHERE deleted = 0"
  ) as unknown as MarketLocaleRow[];
}

// ── Sync Meta ─────────────────────────────────────────────────────────

export interface SyncMetaRow {
  table_name: string;
  last_pull_at: string | null;
  last_push_at: string | null;
  airtable_cursor: string | null;
}

export function getSyncMeta(db: Database, tableName: string): SyncMetaRow | undefined {
  return queryOne(
    db,
    "SELECT * FROM _sync_meta WHERE table_name = ?",
    [tableName]
  ) as unknown as SyncMetaRow | undefined;
}
