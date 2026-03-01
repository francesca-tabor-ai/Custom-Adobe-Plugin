import { LRUCache } from "lru-cache";
import type { BrandPayload } from "@brand-sync/shared";

const cache = new LRUCache<string, BrandPayload>({
  max: 50,
  ttl: 5 * 60 * 1000, // 5 minutes
});

export function getCachedPayload(brandId: string): BrandPayload | undefined {
  return cache.get(brandId);
}

export function setCachedPayload(brandId: string, payload: BrandPayload): void {
  cache.set(brandId, payload);
}

export function invalidateCache(brandId?: string): void {
  if (brandId) {
    cache.delete(brandId);
  } else {
    cache.clear();
  }
}
