/**
 * Normalized brand payload — the central data contract between middleware and plugin.
 *
 * Assembled by the middleware from multiple SQLite tables:
 *   brands, design_tokens, assets_library, disclaimers_library,
 *   claims_library, markets_locales, _sync_meta
 */

export interface BrandPayload {
  meta: BrandMeta;
  swatches: Swatch[];
  typography: TypographyToken[];
  logos: LogoAsset[];
  disclaimers: Disclaimer[];
  claims: Claim[];
  markets: MarketLocale[];
}

export interface BrandMeta {
  brandId: string;
  brandName: string;
  /** SHA-256 hash of the serialized payload, used for ETag / cache validation */
  payloadVersion: string;
  /** ISO 8601 timestamp when this payload was generated */
  generatedAt: string;
  dataVersion: {
    /** Last Airtable pull timestamp from _sync_meta */
    syncedAt: string | null;
    tokensCount: number;
    assetsCount: number;
    disclaimersCount: number;
  };
}

/** Color swatch from design_tokens WHERE type='color' */
export interface Swatch {
  tokenId: string;
  name: string;
  hexValue: string;
  /** Role hint from design_tokens.notes, e.g. "primary", "secondary", "accent" */
  role: string;
  rgb: { r: number; g: number; b: number };
  cmyk?: { c: number; m: number; y: number; k: number };
}

/** Typography token from design_tokens WHERE type='typography' */
export interface TypographyToken {
  tokenId: string;
  name: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: string;
  lineHeight: string;
}

/** Logo asset from assets_library WHERE asset_type LIKE 'logo%' */
export interface LogoAsset {
  assetId: string;
  assetType: string;
  damUrl: string;
  /** Local path if the Python attachment_sync has downloaded the file */
  localPath: string | null;
  usageRights: string;
  allowedMarkets: string[];
  tags: string[];
  status: string;
}

/** Disclaimer from disclaimers_library */
export interface Disclaimer {
  disclaimerId: string;
  disclaimerText: string;
  disclaimerType: string;
  marketLocales: string[];
  version: string;
  status: string;
  validFrom: string;
  validTo: string | null;
}

/** Claim from claims_library */
export interface Claim {
  claimId: string;
  claimText: string;
  claimCategory: string;
  requiresDisclaimer: string;
  allowedMarkets: string[];
  status: string;
}

/** Market/locale from markets_locales */
export interface MarketLocale {
  localeId: string;
  market: string;
  language: string;
  legalRegime: string;
}
