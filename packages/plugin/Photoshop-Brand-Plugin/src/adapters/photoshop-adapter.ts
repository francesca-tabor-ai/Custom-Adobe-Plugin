/**
 * Photoshop adapter — implements HostAdapter for Photoshop UXP.
 *
 * Uses the `photoshop` UXP module and batchPlay for operations.
 */

import type { HostAdapter } from "@brand-sync/plugin-core";
import type { Swatch, LogoAsset, Disclaimer } from "@brand-sync/shared";
import type { ApplyResult, PlaceResult, ValidationResult, ValidationItem } from "@brand-sync/shared";

export class PhotoshopAdapter implements HostAdapter {
  readonly appName = "Photoshop" as const;

  async applySwatches(swatches: Swatch[]): Promise<ApplyResult> {
    const ps = require("photoshop");
    const app = ps.app;

    if (app.documents.length === 0) {
      return { success: false, details: ["No document is open."] };
    }

    const details: string[] = [];
    const { action } = ps;

    for (const swatch of swatches) {
      try {
        await action.batchPlay(
          [
            {
              _obj: "make",
              new: {
                _obj: "colorSampler",
                color: {
                  _obj: "RGBColor",
                  red: swatch.rgb.r,
                  grain: swatch.rgb.g,
                  blue: swatch.rgb.b,
                },
                name: `BS_${swatch.name}`,
              },
              _target: [{ _ref: "colorSampler" }],
            },
          ],
          { modalBehavior: "execute" }
        );
        details.push(`Added: BS_${swatch.name}`);
      } catch (err) {
        try {
          const doc = app.activeDocument;
          doc.foregroundColor = new ps.SolidColor();
          doc.foregroundColor.rgb.red = swatch.rgb.r;
          doc.foregroundColor.rgb.green = swatch.rgb.g;
          doc.foregroundColor.rgb.blue = swatch.rgb.b;
          details.push(`Set foreground: ${swatch.name}`);
        } catch (e2) {
          details.push(`Error (${swatch.name}): ${(e2 as Error).message}`);
        }
      }
    }

    return { success: true, details };
  }

  async placeLogo(asset: LogoAsset): Promise<PlaceResult> {
    const ps = require("photoshop");
    const app = ps.app;

    if (app.documents.length === 0) {
      return { success: false, elementRef: null, detail: "No document is open." };
    }

    const filePath = asset.localPath || asset.damUrl;
    if (!filePath) {
      return { success: false, elementRef: null, detail: "No file path available for this asset." };
    }

    try {
      const { action } = ps;
      await action.batchPlay(
        [
          {
            _obj: "placeEvent",
            null: { _path: filePath, _kind: "local" },
            freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
            linked: false,
          },
        ],
        { modalBehavior: "execute" }
      );

      return {
        success: true,
        elementRef: app.activeDocument.activeLayers?.[0]?.name || null,
        detail: `Placed ${asset.assetType} as embedded smart object`,
      };
    } catch (err) {
      return { success: false, elementRef: null, detail: (err as Error).message };
    }
  }

  async updateLogo(asset: LogoAsset): Promise<PlaceResult> {
    return this.placeLogo(asset);
  }

  async validateColors(brandSwatches: Swatch[]): Promise<ValidationResult> {
    const ps = require("photoshop");
    const app = ps.app;
    const items: ValidationItem[] = [];

    if (app.documents.length === 0) {
      return {
        passed: false,
        checkedAt: new Date().toISOString(),
        items: [{ ruleId: "color.no-document", severity: "error", elementRef: "document", message: "No document is open." }],
        summary: { errors: 1, warnings: 0, info: 0 },
      };
    }

    const doc = app.activeDocument;
    const allowedHexes = new Set(brandSwatches.map((s) => s.hexValue.toUpperCase()));

    function checkLayer(layer: any, path: string): void {
      try {
        if (layer.kind === ps.constants.LayerKind.TEXT) {
          const textColor = layer.textItem?.color;
          if (textColor) {
            const hex = rgbToHex(
              Math.round(textColor.rgb?.red || 0),
              Math.round(textColor.rgb?.green || 0),
              Math.round(textColor.rgb?.blue || 0)
            );
            if (!allowedHexes.has(hex.toUpperCase())) {
              items.push({
                ruleId: "color.off-brand",
                severity: "error",
                elementRef: `Layer: ${path}`,
                message: `Text color ${hex} is not in the brand palette.`,
                suggestedFix: "Change the text color to a brand-approved swatch.",
                meta: { actual: hex, layerName: layer.name },
              });
            }
          }
        }
        if (layer.layers) {
          for (const child of layer.layers) {
            checkLayer(child, `${path}/${child.name}`);
          }
        }
      } catch {
        // Skip unreadable layers
      }
    }

    for (const layer of doc.layers) {
      checkLayer(layer, layer.name);
    }

    const errors = items.filter((i) => i.severity === "error").length;
    const warnings = items.filter((i) => i.severity === "warning").length;
    const info = items.filter((i) => i.severity === "info").length;

    return { passed: errors === 0, checkedAt: new Date().toISOString(), items, summary: { errors, warnings, info } };
  }

  async validateDisclaimerPresence(disclaimers: Disclaimer[]): Promise<ValidationResult> {
    const ps = require("photoshop");
    const app = ps.app;
    const items: ValidationItem[] = [];

    if (app.documents.length === 0) {
      return {
        passed: false,
        checkedAt: new Date().toISOString(),
        items: [{ ruleId: "disclaimer.no-document", severity: "error", elementRef: "document", message: "No document is open." }],
        summary: { errors: 1, warnings: 0, info: 0 },
      };
    }

    const doc = app.activeDocument;
    const allText: string[] = [];

    function collectText(layer: any): void {
      try {
        if (layer.kind === ps.constants.LayerKind.TEXT) {
          const contents = layer.textItem?.contents;
          if (contents) allText.push(contents);
        }
        if (layer.layers) {
          for (const child of layer.layers) {
            collectText(child);
          }
        }
      } catch {
        // Skip unreadable layers
      }
    }

    for (const layer of doc.layers) {
      collectText(layer);
    }

    const fullText = allText.join("\n").toLowerCase();

    for (const disc of disclaimers) {
      if (!disc.disclaimerText || disc.disclaimerText.length < 10) continue;
      const searchText = disc.disclaimerText.toLowerCase().slice(0, 40);
      if (!fullText.includes(searchText)) {
        items.push({
          ruleId: "disclaimer.missing",
          severity: "error",
          elementRef: `Disclaimer: ${disc.disclaimerId}`,
          message: `Required disclaimer not found: "${disc.disclaimerText.slice(0, 60)}..."`,
          suggestedFix: "Add a text layer with the disclaimer text.",
          meta: { disclaimerId: disc.disclaimerId, type: disc.disclaimerType },
        });
      }
    }

    const errors = items.filter((i) => i.severity === "error").length;
    return { passed: errors === 0, checkedAt: new Date().toISOString(), items, summary: { errors, warnings: 0, info: 0 } };
  }

  async getActiveDocumentName(): Promise<string | null> {
    try {
      const ps = require("photoshop");
      return ps.app.activeDocument?.name || null;
    } catch {
      return null;
    }
  }

  async isDocumentOpen(): Promise<boolean> {
    try {
      const ps = require("photoshop");
      return ps.app.documents.length > 0;
    } catch {
      return false;
    }
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}
