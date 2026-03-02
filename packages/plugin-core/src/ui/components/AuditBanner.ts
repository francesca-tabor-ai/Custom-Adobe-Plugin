/**
 * Audit banner — persistent bar showing session info and offline status.
 */

import { authManager } from "../../services/auth-manager";
import type { BrandState } from "../../services/brand-store";

export function renderAuditBanner(state: BrandState): HTMLElement {
  const banner = document.createElement("div");
  banner.className = "bs-audit-banner";

  const user = authManager.getUser();
  const userLabel = user ? user.email : "—";

  const syncLabel = state.lastSyncTime
    ? `Synced: ${formatTime(state.lastSyncTime)}`
    : "Not synced";

  banner.innerHTML = `
    <span>${userLabel}</span>
    <span>${syncLabel}</span>
    ${state.isOffline ? '<span class="bs-offline-badge">OFFLINE</span>' : ""}
  `;

  return banner;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
