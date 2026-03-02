/**
 * Plugin-core barrel export.
 * Host plugins import from here.
 */

export { renderPanel, destroyPanel } from "./ui/App";
export { registerAdapter, getAdapter } from "./adapters/adapter-interface";
export type { HostAdapter } from "./adapters/adapter-interface";
export { brandStore } from "./services/brand-store";
export { auditLogger } from "./services/audit-logger";
export { apiRequest, setBaseUrl, ApiError } from "./services/api-client";
export { authManager } from "./services/auth-manager";
export { cacheManager } from "./services/cache-manager";
export { runFullValidation } from "./services/validation-engine";
export type { FullValidationReport } from "./services/validation-engine";
