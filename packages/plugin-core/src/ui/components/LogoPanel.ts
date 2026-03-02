/**
 * Logo panel — displays brand logo assets and provides "Place in Document" action.
 */

import type { BrandPayload, LogoAsset } from "@brand-sync/shared";
import { getAdapter } from "../../adapters/adapter-interface";
import { auditLogger } from "../../services/audit-logger";

export function renderLogoPanel(brand: BrandPayload): HTMLElement {
  const container = document.createElement("div");
  container.className = "bs-section";

  const title = document.createElement("div");
  title.className = "bs-section-title";
  title.textContent = `Logos (${brand.logos.length})`;
  container.appendChild(title);

  if (brand.logos.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "color:#888; font-size:12px;";
    empty.textContent = "No logo assets available for this brand.";
    container.appendChild(empty);
    return container;
  }

  const list = document.createElement("div");
  list.className = "bs-logo-list";

  for (const logo of brand.logos) {
    list.appendChild(createLogoItem(logo, brand.meta.brandId));
  }

  container.appendChild(list);
  return container;
}

function createLogoItem(logo: LogoAsset, brandId: string): HTMLElement {
  const item = document.createElement("div");
  item.className = "bs-logo-item";

  const info = document.createElement("div");
  info.className = "bs-logo-info";
  info.innerHTML = `
    <div>${logo.assetId}</div>
    <div class="bs-logo-type">${logo.assetType} | ${logo.status}</div>
  `;
  item.appendChild(info);

  const placeBtn = document.createElement("sp-button");
  placeBtn.setAttribute("variant", "primary");
  placeBtn.setAttribute("size", "s");
  placeBtn.textContent = "Place";
  item.appendChild(placeBtn);

  placeBtn.addEventListener("click", async () => {
    placeBtn.setAttribute("disabled", "true");
    placeBtn.textContent = "Placing...";

    try {
      const adapter = getAdapter();
      const result = await adapter.placeLogo(logo);

      placeBtn.textContent = result.success ? "Placed" : "Failed";

      auditLogger.log({
        eventType: "logo.placed",
        brandId,
        detail: { assetId: logo.assetId, assetType: logo.assetType, result: result.detail },
      });
    } catch (err) {
      placeBtn.textContent = "Error";
    } finally {
      setTimeout(() => {
        placeBtn.removeAttribute("disabled");
        placeBtn.textContent = "Place";
      }, 2000);
    }
  });

  return item;
}
