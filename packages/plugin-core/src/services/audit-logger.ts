/**
 * Audit logger — queues events in memory and batch-sends to the middleware.
 * Falls back to localStorage when offline.
 */

import type { AuditEvent, AuditEventType } from "@brand-sync/shared";
import { apiRequest } from "./api-client";
import { authManager } from "./auth-manager";
import { getAdapter } from "../adapters/adapter-interface";

const FLUSH_INTERVAL = 30_000; // 30 seconds
const FLUSH_THRESHOLD = 10;
const OFFLINE_QUEUE_KEY = "brand_sync_audit_queue";
const PLUGIN_VERSION = "1.0.0";

class AuditLogger {
  private queue: AuditEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.start();
    // Load any offline events from previous session
    this.loadOfflineQueue();
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Persist unflushed events
    this.saveOfflineQueue();
  }

  /** Log an audit event (added to queue, flushed periodically). */
  log(params: {
    eventType: AuditEventType;
    brandId: string | null;
    detail?: Record<string, unknown> | null;
  }): void {
    const user = authManager.getUser();
    let appName = "Unknown";

    try {
      const adapter = getAdapter();
      appName = adapter.appName;
    } catch {
      // Adapter not available yet
    }

    const event: AuditEvent = {
      eventType: params.eventType,
      brandId: params.brandId,
      userId: user?.email || "anonymous",
      timestamp: new Date().toISOString(),
      appName,
      appVersion: "",
      pluginVersion: PLUGIN_VERSION,
      documentName: null,
      detail: params.detail ?? null,
    };

    this.queue.push(event);

    if (this.queue.length >= FLUSH_THRESHOLD) {
      this.flush();
    }
  }

  /** Flush queued events to the middleware. */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      await apiRequest("/audit/events", {
        method: "POST",
        body: { events: batch },
      });
    } catch {
      // Offline — save to localStorage for later
      this.queue.unshift(...batch);
      this.saveOfflineQueue();
    }
  }

  private saveOfflineQueue(): void {
    if (this.queue.length === 0) return;
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // localStorage full — drop oldest events
    }
  }

  private loadOfflineQueue(): void {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (raw) {
        const events = JSON.parse(raw) as AuditEvent[];
        this.queue.unshift(...events);
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
      }
    } catch {
      // Corrupted data
    }
  }
}

export const auditLogger = new AuditLogger();
