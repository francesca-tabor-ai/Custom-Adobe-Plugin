import type { AuditEvent } from "@brand-sync/shared";
import { getAuditDb, execStmt, saveAuditDb } from "../db/connection";

/**
 * Persist audit events to the audit SQLite database.
 */
export async function writeAuditEvents(events: AuditEvent[]): Promise<number> {
  const db = await getAuditDb();

  let count = 0;
  for (const evt of events) {
    execStmt(
      db,
      `INSERT INTO audit_events (
        event_type, brand_id, user_id, timestamp,
        app_name, app_version, plugin_version, document_name, detail
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        evt.eventType,
        evt.brandId,
        evt.userId,
        evt.timestamp,
        evt.appName,
        evt.appVersion,
        evt.pluginVersion,
        evt.documentName,
        evt.detail ? JSON.stringify(evt.detail) : null,
      ]
    );
    count++;
  }

  // Persist to disk after batch insert
  saveAuditDb();

  return count;
}
