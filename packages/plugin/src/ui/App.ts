/**
 * Root UI component for the Brand Sync plugin panel.
 * Uses vanilla DOM manipulation (UXP supports DOM but not React/Preact natively).
 * Routes between views based on brand-store state.
 */

import { brandStore, type BrandState } from "../services/brand-store";
import { renderSignIn } from "./components/SignIn";
import { renderBrandSelector } from "./components/BrandSelector";
import { renderBrandDashboard } from "./components/BrandDashboard";
import "./styles/plugin.css";

let rootEl: HTMLDivElement | null = null;
let unsubscribe: (() => void) | null = null;

export function renderPanel(): void {
  rootEl = document.createElement("div");
  rootEl.id = "brand-sync-root";

  // Mount to the panel body
  document.body.innerHTML = "";
  document.body.appendChild(rootEl);

  // Subscribe to state changes
  unsubscribe = brandStore.subscribe(renderView);

  // Initialize store (checks for existing session)
  brandStore.init();

  // Initial render
  renderView(brandStore.getState());
}

export function destroyPanel(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (rootEl) {
    rootEl.remove();
    rootEl = null;
  }
}

function renderView(state: BrandState): void {
  if (!rootEl) return;

  // Clear current content
  rootEl.innerHTML = "";

  switch (state.view) {
    case "sign-in":
      rootEl.appendChild(renderSignIn());
      break;
    case "brand-select":
      rootEl.appendChild(renderBrandSelector(state));
      break;
    case "dashboard":
      rootEl.appendChild(renderBrandDashboard(state));
      break;
  }
}
