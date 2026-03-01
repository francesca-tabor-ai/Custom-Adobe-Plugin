/**
 * Offline cache using UXP's localStorage.
 * Caches brand payloads so the plugin works when the middleware is unreachable.
 */

import type { BrandPayload } from "../../../shared/src/types/brand-payload";

const CACHE_PREFIX = "brand_cache_";

interface CachedEntry {
  payload: BrandPayload;
  payloadVersion: string;
  cachedAt: string;
}

class CacheManager {
  get(brandId: string): CachedEntry | null {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${brandId}`);
      if (!raw) return null;
      return JSON.parse(raw) as CachedEntry;
    } catch {
      return null;
    }
  }

  set(brandId: string, payload: BrandPayload): void {
    const entry: CachedEntry = {
      payload,
      payloadVersion: payload.meta.payloadVersion,
      cachedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`${CACHE_PREFIX}${brandId}`, JSON.stringify(entry));
    } catch {
      // localStorage might be full — silently fail
    }
  }

  remove(brandId: string): void {
    localStorage.removeItem(`${CACHE_PREFIX}${brandId}`);
  }

  /** Get all cached brand IDs (for "recent brands" list) */
  getCachedBrandIds(): string[] {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        ids.push(key.slice(CACHE_PREFIX.length));
      }
    }
    return ids;
  }
}

export const cacheManager = new CacheManager();
