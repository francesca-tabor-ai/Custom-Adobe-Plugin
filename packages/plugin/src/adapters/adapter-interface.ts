/**
 * Abstract host adapter contract.
 * Each Adobe app implements this interface to provide app-specific document operations.
 */

import type { Swatch, LogoAsset, Disclaimer } from "../../../shared/src/types/brand-payload";
import type {
  ApplyResult,
  PlaceResult,
  ValidationResult,
} from "../../../shared/src/types/validation-result";

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
