/**
 * Reactive state management for the active brand and plugin state.
 */

import type { BrandPayload } from "../../../shared/src/types/brand-payload";
import type { BrandsListResponse, LoginResponse } from "../../../shared/src/types/api-contracts";
import { apiRequest, ApiError } from "./api-client";
import { authManager } from "./auth-manager";
import { cacheManager } from "./cache-manager";

export type AppView = "sign-in" | "brand-select" | "dashboard";

export interface BrandState {
  view: AppView;
  isLoading: boolean;
  lastError: string | null;
  isOffline: boolean;
  brands: Array<{ brandId: string; name: string }>;
  activeBrand: BrandPayload | null;
  lastSyncTime: string | null;
}

type Listener = (state: BrandState) => void;

class BrandStore {
  private state: BrandState = {
    view: "sign-in",
    isLoading: false,
    lastError: null,
    isOffline: false,
    brands: [],
    activeBrand: null,
    lastSyncTime: null,
  };

  private listeners: Listener[] = [];

  getState(): Readonly<BrandState> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private update(partial: Partial<BrandState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /** Initialize — check for existing session */
  init(): void {
    if (authManager.isAuthenticated()) {
      this.update({ view: "brand-select" });
      this.fetchBrands();
    }
  }

  /** Sign in with email + password */
  async login(email: string, password: string): Promise<void> {
    this.update({ isLoading: true, lastError: null });

    try {
      const resp = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
        skipAuth: true,
      });

      authManager.save(resp.token, resp.expiresAt, resp.user);
      this.update({ view: "brand-select", isLoading: false });
      await this.fetchBrands();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed";
      this.update({ isLoading: false, lastError: msg });
    }
  }

  /** Sign out and return to login screen */
  logout(): void {
    authManager.clear();
    this.update({
      view: "sign-in",
      brands: [],
      activeBrand: null,
      lastSyncTime: null,
      isOffline: false,
    });
  }

  /** Fetch the list of available brands */
  async fetchBrands(): Promise<void> {
    try {
      const resp = await apiRequest<BrandsListResponse>("/brands");
      this.update({ brands: resp.brands, isOffline: false });
    } catch {
      this.update({ isOffline: true });
    }
  }

  /** Select a brand and fetch its full payload */
  async selectBrand(brandId: string): Promise<void> {
    this.update({ isLoading: true, lastError: null });

    // Check cache first for ETag
    const cached = cacheManager.get(brandId);
    const ifNoneMatch = cached?.payloadVersion || "";

    try {
      const queryParam = ifNoneMatch ? `?ifNoneMatch=${ifNoneMatch}` : "";
      const payload = await apiRequest<BrandPayload | null>(
        `/brands/${brandId}/payload${queryParam}`
      );

      if (payload === null && cached) {
        // 304 — use cached version
        this.update({
          view: "dashboard",
          activeBrand: cached.payload,
          lastSyncTime: new Date().toISOString(),
          isLoading: false,
          isOffline: false,
        });
      } else if (payload) {
        cacheManager.set(brandId, payload);
        this.update({
          view: "dashboard",
          activeBrand: payload,
          lastSyncTime: new Date().toISOString(),
          isLoading: false,
          isOffline: false,
        });
      }
    } catch {
      // Offline fallback
      if (cached) {
        this.update({
          view: "dashboard",
          activeBrand: cached.payload,
          lastSyncTime: cached.cachedAt,
          isLoading: false,
          isOffline: true,
        });
      } else {
        this.update({
          isLoading: false,
          lastError: "Failed to load brand. No cached version available.",
        });
      }
    }
  }

  /** Navigate back to brand selection */
  goToBrandSelect(): void {
    this.update({ view: "brand-select", activeBrand: null });
  }
}

export const brandStore = new BrandStore();
