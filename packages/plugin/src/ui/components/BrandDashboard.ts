/**
 * Brand dashboard component.
 * Shows brand info, tabs for Swatches / Logos / Validation, and audit banner.
 */

import { brandStore, type BrandState } from "../../services/brand-store";
import { renderSwatchPanel } from "./SwatchPanel";
import { renderLogoPanel } from "./LogoPanel";
import { renderValidationPanel } from "./ValidationPanel";
import { renderAuditBanner } from "./AuditBanner";

let activeTab: "swatches" | "logos" | "validation" = "swatches";

export function renderBrandDashboard(state: BrandState): HTMLElement {
  const container = document.createElement("div");
  const brand = state.activeBrand;

  if (!brand) {
    container.innerHTML = `<div class="bs-loading">No brand loaded.</div>`;
    return container;
  }

  // Header
  const header = document.createElement("div");
  header.className = "bs-dash-header";
  header.innerHTML = `
    <h2>${brand.meta.brandName}</h2>
    <sp-button variant="secondary" size="s" id="bs-back-btn">Switch Brand</sp-button>
  `;
  container.appendChild(header);

  // Meta row
  const meta = document.createElement("div");
  meta.className = "bs-meta-row";
  meta.innerHTML = `
    <span>Version: ${brand.meta.payloadVersion.slice(0, 8)}</span>
    <span>${brand.swatches.length} colors | ${brand.logos.length} logos</span>
  `;
  container.appendChild(meta);

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "bs-tabs";

  const tabDefs: Array<{ id: typeof activeTab; label: string }> = [
    { id: "swatches", label: "Swatches" },
    { id: "logos", label: "Logos" },
    { id: "validation", label: "Validate" },
  ];

  for (const tab of tabDefs) {
    const btn = document.createElement("button");
    btn.className = `bs-tab${tab.id === activeTab ? " active" : ""}`;
    btn.textContent = tab.label;
    btn.addEventListener("click", () => {
      activeTab = tab.id;
      // Re-render dashboard
      const newDash = renderBrandDashboard(state);
      container.replaceWith(newDash);
    });
    tabs.appendChild(btn);
  }
  container.appendChild(tabs);

  // Tab content
  const content = document.createElement("div");
  switch (activeTab) {
    case "swatches":
      content.appendChild(renderSwatchPanel(brand));
      break;
    case "logos":
      content.appendChild(renderLogoPanel(brand));
      break;
    case "validation":
      content.appendChild(renderValidationPanel(brand));
      break;
  }
  container.appendChild(content);

  // Audit banner
  container.appendChild(renderAuditBanner(state));

  // Wire events
  setTimeout(() => {
    document.getElementById("bs-back-btn")?.addEventListener("click", () => {
      activeTab = "swatches";
      brandStore.goToBrandSelect();
    });
  }, 0);

  return container;
}
