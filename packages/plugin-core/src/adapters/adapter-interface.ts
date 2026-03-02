/**
 * Abstract host adapter contract.
 * Each Adobe app implements this interface to provide app-specific document operations.
 */

import type { Swatch, LogoAsset, Disclaimer } from "@brand-sync/shared";
import type {
  ApplyResult,
  PlaceResult,
  ValidationResult,
} from "@brand-sync/shared";

export interface HostAdapter {
  readonly appName: "InDesign" | "Photoshop";

  /** Create or update named color swatches in the active document. */
  applySwatches(swatches: Swatch[]): Promise<ApplyResult>;

  /** Place a logo asset into the active document. */
  placeLogo(asset: LogoAsset): Promise<PlaceResult>;

  /** Update an existing placed logo with a new version. */
  updateLogo(asset: LogoAsset): Promise<PlaceResult>;

  /** Validate that all colors in the document are from the brand palette. */
  validateColors(brandSwatches: Swatch[]): Promise<ValidationResult>;

  /** Validate that required disclaimers are present in the document text. */
  validateDisclaimerPresence(disclaimers: Disclaimer[]): Promise<ValidationResult>;

  /** Get the name of the active document, or null if none is open. */
  getActiveDocumentName(): Promise<string | null>;

  /** Check whether a document is open. */
  isDocumentOpen(): Promise<boolean>;
}

// ── Adapter registry ──────────────────────────────────────────────

let registeredAdapter: HostAdapter | null = null;

export function registerAdapter(adapter: HostAdapter): void {
  registeredAdapter = adapter;
}

export function getAdapter(): HostAdapter {
  if (!registeredAdapter) {
    throw new Error("No host adapter registered. Call registerAdapter() in the host plugin entry.");
  }
  return registeredAdapter;
}
