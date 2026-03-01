/**
 * Sign-in form component.
 * Uses Spectrum Web Components (<sp-textfield>, <sp-button>).
 */

import { brandStore } from "../../services/brand-store";

export function renderSignIn(): HTMLElement {
  const container = document.createElement("div");
  container.className = "bs-sign-in";

  container.innerHTML = `
    <h2>Brand Sync</h2>
    <p>Sign in to access your organization's brand assets and governance tools.</p>
    <sp-textfield id="bs-email" placeholder="Email" type="email"></sp-textfield>
    <sp-textfield id="bs-password" placeholder="Password" type="password"></sp-textfield>
    <div id="bs-login-error" class="bs-error" style="display:none"></div>
    <sp-button id="bs-login-btn" variant="cta">Sign In</sp-button>
  `;

  // Wire up events after DOM insertion
  setTimeout(() => {
    const emailField = document.getElementById("bs-email") as HTMLInputElement;
    const passwordField = document.getElementById("bs-password") as HTMLInputElement;
    const loginBtn = document.getElementById("bs-login-btn");
    const errorEl = document.getElementById("bs-login-error");

    loginBtn?.addEventListener("click", async () => {
      const email = emailField?.value?.trim();
      const password = passwordField?.value;

      if (!email || !password) {
        if (errorEl) {
          errorEl.textContent = "Please enter email and password.";
          errorEl.style.display = "block";
        }
        return;
      }

      if (errorEl) errorEl.style.display = "none";
      loginBtn.setAttribute("disabled", "true");

      await brandStore.login(email, password);

      const state = brandStore.getState();
      if (state.lastError) {
        if (errorEl) {
          errorEl.textContent = state.lastError;
          errorEl.style.display = "block";
        }
        loginBtn.removeAttribute("disabled");
      }
    });
  }, 0);

  return container;
}
