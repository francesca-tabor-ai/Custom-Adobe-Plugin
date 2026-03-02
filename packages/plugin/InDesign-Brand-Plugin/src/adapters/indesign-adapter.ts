/**
 * InDesign adapter — implements HostAdapter for InDesign UXP.
 *
 * Uses the `indesign` UXP module for document operations.
 * Pattern references from: Adobe-Templatization/_scripts/indesign/data-merge-export.jsx
 *   - doc.stories iteration for text frames (line 142-151)
 *   - preflight/validation pattern (line 153-165)
 */

import type { HostAdapter } from "@brand-sync/plugin-core";
import type { Swatch, LogoAsset, Disclaimer } from "@brand-sync/shared";
import type { ApplyResult, PlaceResult, ValidationResult, ValidationItem } from "@brand-sync/shared";

const BRAND_PREFIX = "BS_";

export class InDesignAdapter implements HostAdapter {
  readonly appName = "InDesign" as const;

  async applySwatches(swatches: Swatch[]): Promise<ApplyResult> {
    const indesign = require("indesign");
    const app = indesign.app;
    const doc = app.activeDocument;

    if (!doc) {
      return { success: false, details: ["No document is open."] };
    }

    const details: string[] = [];

    for (const swatch of swatches) {
      const swatchName = `${BRAND_PREFIX}${swatch.name}`;
      const colorValue = [swatch.rgb.r, swatch.rgb.g, swatch.rgb.b];

      try {
        let existing = null;
        try {
          existing = doc.colors.itemByName(swatchName);
          // Check if it's valid (exists)
          existing.name; // Throws if invalid
        } catch {
          existing = null;
        }

        if (existing) {
          // Update existing swatch
          existing.colorValue = colorValue;
          details.push(`Updated: ${swatchName}`);
        } else {
          // Create new swatch
          const newColor = doc.colors.add();
          newColor.name = swatchName;
          newColor.space = indesign.ColorSpace.RGB;
          newColor.colorValue = colorValue;
          details.push(`Created: ${swatchName}`);
        }
      } catch (err) {
        details.push(`Error (${swatchName}): ${(err as Error).message}`);
      }
    }

    return { success: true, details };
  }

  async placeLogo(asset: LogoAsset): Promise<PlaceResult> {
    const indesign = require("indesign");
    const app = indesign.app;
    const doc = app.activeDocument;

    if (!doc) {
      return { success: false, elementRef: null, detail: "No document is open." };
    }

    try {
      const page = doc.pages[0];
      const filePath = asset.localPath || asset.damUrl;

      if (!filePath) {
        return { success: false, elementRef: null, detail: "No file path available for this asset." };
      }

      // Create a rectangle frame and place the logo
      const pageBounds = page.bounds; // [y1, x1, y2, x2]
      const pageWidth = pageBounds[3] - pageBounds[1];
      const pageHeight = pageBounds[2] - pageBounds[0];

      // Center-ish placement, 25% of page width
      const logoWidth = pageWidth * 0.25;
      const x = (pageWidth - logoWidth) / 2 + pageBounds[1];
      const y = pageBounds[0] + 20; // 20pt from top

      const frame = page.rectangles.add({
        geometricBounds: [y, x, y + logoWidth * 0.5, x + logoWidth],
      });

      const uxpFs = require("uxp").storage;
      const file = await uxpFs.localFileSystem.getFileForOpening({ initialLocation: filePath });

      if (file) {
        frame.place(file);
        frame.fit(indesign.FitOptions.PROPORTIONALLY);
      }

      return {
        success: true,
        elementRef: frame.id?.toString() || null,
        detail: `Placed ${asset.assetType} on page 1`,
      };
    } catch (err) {
      return { success: false, elementRef: null, detail: (err as Error).message };
    }
  }

  async updateLogo(asset: LogoAsset): Promise<PlaceResult> {
    // For v1, updateLogo falls back to placeLogo
    return this.placeLogo(asset);
  }

  async validateColors(brandSwatches: Swatch[]): Promise<ValidationResult> {
    const indesign = require("indesign");
    const app = indesign.app;
    const doc = app.activeDocument;

    const items: ValidationItem[] = [];

    if (!doc) {
      return {
        passed: false,
        checkedAt: new Date().toISOString(),
        items: [{ ruleId: "color.no-document", severity: "error", elementRef: "document", message: "No document is open." }],
        summary: { errors: 1, warnings: 0, info: 0 },
      };
    }

    // Build a set of allowed hex values (uppercase)
    const allowedHexes = new Set(brandSwatches.map((s) => s.hexValue.toUpperCase()));

    // Check all document colors (swatches)
    for (let i = 0; i < doc.colors.length; i++) {
      const color = doc.colors[i];

      try {
        // Skip default/system swatches
        const name: string = color.name;
        if (name === "None" || name === "Paper" || name === "Black" || name === "Registration") {
          continue;
        }

        // Skip brand-prefixed swatches (they're ours)
        if (name.startsWith(BRAND_PREFIX)) continue;

        // Get the color value and convert to hex
        const space = color.space;
        let hex = "";

        if (space === indesign.ColorSpace.RGB) {
          const [r, g, b] = color.colorValue;
          hex = rgbToHex(Math.round(r), Math.round(g), Math.round(b));
        }

        if (hex && !allowedHexes.has(hex.toUpperCase())) {
          items.push({
            ruleId: "color.off-brand",
            severity: "error",
            elementRef: `Swatch: ${name}`,
            message: `Color ${hex} is not in the brand palette.`,
            suggestedFix: `Replace with the nearest brand color.`,
            meta: { actual: hex, swatchName: name },
          });
        }
      } catch {
        // Skip unreadable swatches
      }
    }

    const errors = items.filter((i) => i.severity === "error").length;
    const warnings = items.filter((i) => i.severity === "warning").length;
    const info = items.filter((i) => i.severity === "info").length;

    return {
      passed: errors === 0,
      checkedAt: new Date().toISOString(),
      items,
      summary: { errors, warnings, info },
    };
  }

  async validateDisclaimerPresence(disclaimers: Disclaimer[]): Promise<ValidationResult> {
    const indesign = require("indesign");
    const app = indesign.app;
    const doc = app.activeDocument;

    const items: ValidationItem[] = [];

    if (!doc) {
      return {
        passed: false,
        checkedAt: new Date().toISOString(),
        items: [{ ruleId: "disclaimer.no-document", severity: "error", elementRef: "document", message: "No document is open." }],
        summary: { errors: 1, warnings: 0, info: 0 },
      };
    }

    // Collect all text content from the document
    // Pattern from data-merge-export.jsx:142 — iterate doc.stories
    const allText: string[] = [];
    for (let i = 0; i < doc.stories.length; i++) {
      try {
        const storyText = doc.stories[i].contents;
        if (storyText) allText.push(storyText);
      } catch {
        // Skip unreadable stories
      }
    }

    const fullText = allText.join("\n").toLowerCase();

    // Check each active disclaimer
    for (const disc of disclaimers) {
      if (!disc.disclaimerText || disc.disclaimerText.length < 10) continue;

      // Use first 20+ characters as a matching substring
      const searchText = disc.disclaimerText.toLowerCase().slice(0, 40);
      const found = fullText.includes(searchText);

      if (!found) {
        items.push({
          ruleId: "disclaimer.missing",
          severity: "error",
          elementRef: `Disclaimer: ${disc.disclaimerId}`,
          message: `Required disclaimer not found: "${disc.disclaimerText.slice(0, 60)}..."`,
          suggestedFix: "Add a text frame with the disclaimer text.",
          meta: { disclaimerId: disc.disclaimerId, type: disc.disclaimerType },
        });
      }
    }

    const errors = items.filter((i) => i.severity === "error").length;

    return {
      passed: errors === 0,
      checkedAt: new Date().toISOString(),
      items,
      summary: { errors, warnings: 0, info: 0 },
    };
  }

  async getActiveDocumentName(): Promise<string | null> {
    try {
      const indesign = require("indesign");
      return indesign.app.activeDocument?.name || null;
    } catch {
      return null;
    }
  }

  async isDocumentOpen(): Promise<boolean> {
    try {
      const indesign = require("indesign");
      return indesign.app.documents.length > 0;
    } catch {
      return false;
    }
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}
