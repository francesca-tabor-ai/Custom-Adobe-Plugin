/**
 * Validation panel — runs color compliance and disclaimer presence checks.
 */

import type { BrandPayload } from "@brand-sync/shared";
import type { ValidationResult } from "@brand-sync/shared";
import { getAdapter } from "../../adapters/adapter-interface";
import { auditLogger } from "../../services/audit-logger";

export function renderValidationPanel(brand: BrandPayload): HTMLElement {
  const container = document.createElement("div");
  container.className = "bs-section";

  const title = document.createElement("div");
  title.className = "bs-section-title";
  title.textContent = "Document Validation";
  container.appendChild(title);

  const desc = document.createElement("p");
  desc.style.cssText = "color:#888; font-size:12px; margin:0 0 12px 0;";
  desc.textContent = "Check your document against brand color rules and required disclaimers.";
  container.appendChild(desc);

  const btnRow = document.createElement("div");
  btnRow.className = "bs-btn-row";

  const validateBtn = document.createElement("sp-button");
  validateBtn.setAttribute("variant", "cta");
  validateBtn.setAttribute("size", "s");
  validateBtn.textContent = "Run Validation";
  btnRow.appendChild(validateBtn);
  container.appendChild(btnRow);

  const resultsEl = document.createElement("div");
  resultsEl.id = "bs-validation-results";
  resultsEl.style.marginTop = "12px";
  container.appendChild(resultsEl);

  validateBtn.addEventListener("click", async () => {
    validateBtn.setAttribute("disabled", "true");
    validateBtn.textContent = "Validating...";
    resultsEl.innerHTML = "";

    try {
      const adapter = getAdapter();

      // Run both validations
      const [colorResult, disclaimerResult] = await Promise.all([
        adapter.validateColors(brand.swatches),
        adapter.validateDisclaimerPresence(brand.disclaimers),
      ]);

      renderResults(resultsEl, "Color Compliance", colorResult);
      renderResults(resultsEl, "Disclaimer Presence", disclaimerResult);

      auditLogger.log({
        eventType: "validation.color_check",
        brandId: brand.meta.brandId,
        detail: {
          colorErrors: colorResult.summary.errors,
          disclaimerErrors: disclaimerResult.summary.errors,
          passed: colorResult.passed && disclaimerResult.passed,
        },
      });
    } catch (err) {
      resultsEl.innerHTML = `<div class="bs-error">Validation failed: ${(err as Error).message}</div>`;
    } finally {
      validateBtn.removeAttribute("disabled");
      validateBtn.textContent = "Run Validation";
    }
  });

  return container;
}

function renderResults(
  parent: HTMLElement,
  sectionTitle: string,
  result: ValidationResult
): void {
  const section = document.createElement("div");
  section.className = "bs-section";

  const title = document.createElement("div");
  title.className = "bs-section-title";
  title.textContent = `${sectionTitle} ${result.passed ? "(Passed)" : "(Issues Found)"}`;
  title.style.color = result.passed ? "#2d9d78" : "#e03e3e";
  section.appendChild(title);

  if (result.items.length === 0) {
    const noIssues = document.createElement("div");
    noIssues.className = "bs-validation-item pass";
    noIssues.textContent = "No issues found.";
    section.appendChild(noIssues);
  } else {
    const list = document.createElement("div");
    list.className = "bs-validation-list";

    for (const item of result.items) {
      const el = document.createElement("div");
      el.className = `bs-validation-item ${item.severity}`;
      el.innerHTML = `
        <strong>${item.elementRef}</strong>: ${item.message}
        ${item.suggestedFix ? `<br/><em style="font-size:11px;">${item.suggestedFix}</em>` : ""}
      `;
      list.appendChild(el);
    }

    section.appendChild(list);
  }

  parent.appendChild(section);
}
