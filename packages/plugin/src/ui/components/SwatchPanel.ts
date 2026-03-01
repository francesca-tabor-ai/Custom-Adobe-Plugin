/**
 * Swatch panel — displays brand color swatches and provides "Apply to Document" action.
 */

import type { BrandPayload } from "../../../../shared/src/types/brand-payload";
import { getAdapter } from "../../adapters/adapter-factory";
import { auditLogger } from "../../services/audit-logger";

export function renderSwatchPanel(brand: BrandPayload): HTMLElement {
  const container = document.createElement("div");
  container.className = "bs-section";

  const title = document.createElement("div");
  title.className = "bs-section-title";
  title.textContent = `Colors (${brand.swatches.length})`;
  container.appendChild(title);

  // Swatch grid
  const grid = document.createElement("div");
  grid.className = "bs-swatch-grid";

  for (const swatch of brand.swatches) {
    const chip = document.createElement("div");
    chip.className = "bs-swatch-chip";

    const colorBox = document.createElement("div");
    colorBox.className = "bs-swatch-color";
    colorBox.style.backgroundColor = swatch.hexValue;
    chip.appendChild(colorBox);

    const label = document.createElement("div");
    label.className = "bs-swatch-label";
    label.textContent = swatch.name;
    chip.appendChild(label);

    const hex = document.createElement("div");
    hex.className = "bs-swatch-label";
    hex.textContent = swatch.hexValue;
    hex.style.color = "#888";
    chip.appendChild(hex);

    grid.appendChild(chip);
  }
  container.appendChild(grid);

  // Apply button
  const btnRow = document.createElement("div");
  btnRow.className = "bs-btn-row";

  const applyBtn = document.createElement("sp-button");
  applyBtn.setAttribute("variant", "cta");
  applyBtn.setAttribute("size", "s");
  applyBtn.textContent = "Apply All to Document";
  btnRow.appendChild(applyBtn);

  const statusEl = document.createElement("div");
  statusEl.id = "bs-swatch-status";
  statusEl.style.fontSize = "11px";
  statusEl.style.marginTop = "8px";

  container.appendChild(btnRow);
  container.appendChild(statusEl);

  // Wire apply action
  applyBtn.addEventListener("click", async () => {
    applyBtn.setAttribute("disabled", "true");
    statusEl.textContent = "Applying swatches...";

    try {
      const adapter = getAdapter();
      const result = await adapter.applySwatches(brand.swatches);

      statusEl.textContent = result.success
        ? `Applied ${result.details.length} swatches.`
        : `Failed: ${result.details.join(", ")}`;

      auditLogger.log({
        eventType: "swatch.applied",
        brandId: brand.meta.brandId,
        detail: { count: result.details.length, details: result.details },
      });
    } catch (err) {
      statusEl.textContent = `Error: ${(err as Error).message}`;
    } finally {
      applyBtn.removeAttribute("disabled");
    }
  });

  return container;
}
