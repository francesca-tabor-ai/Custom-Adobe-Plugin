/**
 * Validation engine — orchestrates adapter-level validation checks
 * and aggregates results.
 */

import type { BrandPayload } from "@brand-sync/shared";
import type { ValidationResult } from "@brand-sync/shared";
import { getAdapter } from "../adapters/adapter-interface";

export interface FullValidationReport {
  colorResult: ValidationResult;
  disclaimerResult: ValidationResult;
  overall: {
    passed: boolean;
    totalErrors: number;
    totalWarnings: number;
  };
}

/**
 * Run all v1 validations against the active document.
 */
export async function runFullValidation(brand: BrandPayload): Promise<FullValidationReport> {
  const adapter = getAdapter();

  const [colorResult, disclaimerResult] = await Promise.all([
    adapter.validateColors(brand.swatches),
    adapter.validateDisclaimerPresence(brand.disclaimers),
  ]);

  const totalErrors = colorResult.summary.errors + disclaimerResult.summary.errors;
  const totalWarnings = colorResult.summary.warnings + disclaimerResult.summary.warnings;

  return {
    colorResult,
    disclaimerResult,
    overall: {
      passed: totalErrors === 0,
      totalErrors,
      totalWarnings,
    },
  };
}
