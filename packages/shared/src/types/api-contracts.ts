import type { BrandPayload } from "./brand-payload";
import type { AuditEvent } from "./audit-event";

// ── Auth ──────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: {
    email: string;
    name: string;
  };
}

export interface RefreshResponse {
  token: string;
  expiresAt: string;
}

// ── Brands ────────────────────────────────────────────────────────────

export interface BrandListItem {
  brandId: string;
  name: string;
}

export interface BrandsListResponse {
  brands: BrandListItem[];
}

/** GET /brands/:id/payload — returns full payload or 304 if version matches */
export type BrandPayloadResponse = BrandPayload;

// ── Audit ─────────────────────────────────────────────────────────────

export interface AuditEventsRequest {
  events: AuditEvent[];
}

export interface AuditEventsResponse {
  received: number;
}

// ── Health ────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded";
  dbConnected: boolean;
  lastSync: string | null;
}

// ── Errors ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
