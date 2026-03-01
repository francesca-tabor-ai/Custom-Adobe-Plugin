import * as crypto from "crypto";
import type { Database } from "sql.js";
import type {
  BrandPayload,
  Swatch,
  TypographyToken,
  LogoAsset,
  Disclaimer,
  Claim,
  MarketLocale,
} from "@brand-sync/shared";
import {
  getBrandById,
  getDesignTokensByBrand,
  getAssetsByBrand,
  getDisclaimers,
  getClaims,
  getMarkets,
  getSyncMeta,
  type DesignTokenRow,
  type AssetRow,
  type DisclaimerRow,
  type ClaimRow,
  type MarketLocaleRow,
} from "../db/queries";

/**
 * Build the normalized BrandPayload from multiple SQLite tables.
 * Returns null if the brand is not found.
 */
export function buildBrandPayload(
  db: Database,
  brandId: string
): BrandPayload | null {
  const brand = getBrandById(db, brandId);
  if (!brand) return null;

  const colorTokens = getDesignTokensByBrand(db, brandId, "color");
  const typographyTokens = getDesignTokensByBrand(db, brandId, "typography");
  const logoAssets = getAssetsByBrand(db, brandId, "logo");
  const disclaimers = getDisclaimers(db);
  const claims = getClaims(db);
  const markets = getMarkets(db);
  const syncMeta = getSyncMeta(db, "brands");

  const swatches = colorTokens.map(tokenToSwatch);
  const typography = typographyTokens.map(tokenToTypography);
  const logos = logoAssets.map(assetToLogo);
  const disclaimerList = disclaimers.map(rowToDisclaimer);
  const claimList = claims.map(rowToClaim);
  const marketList = markets.map(rowToMarket);

  const payload: BrandPayload = {
    meta: {
      brandId: brand.brand_id,
      brandName: brand.name,
      payloadVersion: "", // computed below
      generatedAt: new Date().toISOString(),
      dataVersion: {
        syncedAt: syncMeta?.last_pull_at ?? null,
        tokensCount: colorTokens.length + typographyTokens.length,
        assetsCount: logoAssets.length,
        disclaimersCount: disclaimers.length,
      },
    },
    swatches,
    typography,
    logos,
    disclaimers: disclaimerList,
    claims: claimList,
    markets: marketList,
  };

  // Compute deterministic version hash over payload content (excluding meta timestamps)
  payload.meta.payloadVersion = computePayloadHash(payload);

  return payload;
}

// ── Mappers ──────────────────────────────────────────────────────────

function tokenToSwatch(row: DesignTokenRow): Swatch {
  const hex = normalizeHex(row.value);
  const rgb = hexToRgb(hex);

  return {
    tokenId: row.token_id,
    name: row.name,
    hexValue: hex,
    role: row.notes || "custom",
    rgb,
  };
}

function tokenToTypography(row: DesignTokenRow): TypographyToken {
  // Typography value is expected as JSON: { fontFamily, fontWeight, fontSize, lineHeight }
  // or as a simple font family string
  let parsed: Record<string, string> = {};
  try {
    parsed = JSON.parse(row.value);
  } catch {
    parsed = { fontFamily: row.value };
  }

  return {
    tokenId: row.token_id,
    name: row.name,
    fontFamily: parsed.fontFamily || row.value,
    fontWeight: parsed.fontWeight || "400",
    fontSize: parsed.fontSize || "16px",
    lineHeight: parsed.lineHeight || "1.5",
  };
}

function assetToLogo(row: AssetRow): LogoAsset {
  return {
    assetId: row.asset_id,
    assetType: row.asset_type,
    damUrl: row.dam_url || "",
    localPath: null, // populated by plugin if attachment is downloaded
    usageRights: row.usage_rights || "",
    allowedMarkets: parseJsonArray(row.allowed_markets),
    tags: parseJsonArray(row.tags),
    status: row.status || "active",
  };
}

function rowToDisclaimer(row: DisclaimerRow): Disclaimer {
  return {
    disclaimerId: row.disclaimer_id,
    disclaimerText: row.disclaimer_text || "",
    disclaimerType: row.disclaimer_type || "",
    marketLocales: parseJsonArray(row.market_locales),
    version: row.disclaimer_version || "1",
    status: row.status || "active",
    validFrom: row.valid_from || "",
    validTo: row.valid_to ?? null,
  };
}

function rowToClaim(row: ClaimRow): Claim {
  return {
    claimId: row.claim_id,
    claimText: row.claim_text || "",
    claimCategory: row.claim_category || "",
    requiresDisclaimer: row.requires_disclaimer || "",
    allowedMarkets: parseJsonArray(row.allowed_markets),
    status: row.status || "active",
  };
}

function rowToMarket(row: MarketLocaleRow): MarketLocale {
  return {
    localeId: row.locale_id,
    market: row.market || "",
    language: row.language || "",
    legalRegime: row.legal_regime || "",
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeHex(value: string): string {
  let hex = value.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  // Expand shorthand #RGB to #RRGGBB
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  return {
    r: parseInt(cleaned.substring(0, 2), 16) || 0,
    g: parseInt(cleaned.substring(2, 4), 16) || 0,
    b: parseInt(cleaned.substring(4, 6), 16) || 0,
  };
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    // Fallback: split comma-separated string
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function computePayloadHash(payload: BrandPayload): string {
  // Hash everything except meta.payloadVersion and meta.generatedAt
  const hashInput = {
    brandId: payload.meta.brandId,
    swatches: payload.swatches,
    typography: payload.typography,
    logos: payload.logos,
    disclaimers: payload.disclaimers,
    claims: payload.claims,
    markets: payload.markets,
  };
  return crypto.createHash("sha256").update(JSON.stringify(hashInput)).digest("hex").slice(0, 16);
}
