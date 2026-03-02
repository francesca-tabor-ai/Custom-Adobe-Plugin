/**
 * Brand selection component.
 * Shows a list of available brands from the middleware.
 */

import { brandStore, type BrandState } from "../../services/brand-store";

export function renderBrandSelector(state: BrandState): HTMLElement {
  const container = document.createElement("div");

  const header = document.createElement("div");
  header.className = "bs-dash-header";
  header.innerHTML = `
    <h2>Select Brand</h2>
    <sp-button variant="secondary" size="s" id="bs-logout-btn">Sign Out</sp-button>
  `;
  container.appendChild(header);

  if (state.isLoading) {
    const loading = document.createElement("div");
    loading.className = "bs-loading";
    loading.textContent = "Loading brands...";
    container.appendChild(loading);
    return container;
  }

  if (state.lastError) {
    const error = document.createElement("div");
    error.className = "bs-error";
    error.textContent = state.lastError;
    container.appendChild(error);
  }

  if (state.isOffline) {
    const offline = document.createElement("div");
    offline.className = "bs-error";
    offline.textContent = "Unable to reach middleware. Check that the server is running.";
    container.appendChild(offline);
  }

  const list = document.createElement("div");
  list.className = "bs-brand-list";

  if (state.brands.length === 0) {
    list.innerHTML = `<p style="color:#888; font-size:12px;">No brands found.</p>`;
  }

  for (const brand of state.brands) {
    const item = document.createElement("div");
    item.className = "bs-brand-item";
    item.textContent = brand.name;
    item.dataset.brandId = brand.brandId;
    item.addEventListener("click", () => {
      brandStore.selectBrand(brand.brandId);
    });
    list.appendChild(item);
  }

  container.appendChild(list);

  // Wire logout
  setTimeout(() => {
    document.getElementById("bs-logout-btn")?.addEventListener("click", () => {
      brandStore.logout();
    });
  }, 0);

  return container;
}
