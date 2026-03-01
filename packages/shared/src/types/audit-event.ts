export type AuditEventType =
  | "auth.login"
  | "brand.selected"
  | "brand.payload_fetched"
  | "swatch.applied"
  | "logo.placed"
  | "logo.updated"
  | "validation.color_check"
  | "validation.disclaimer_check"
  | "export.completed";

export interface AuditEvent {
  eventType: AuditEventType;
  brandId: string | null;
  userId: string;
  timestamp: string;
  appName: string;
  appVersion: string;
  pluginVersion: string;
  documentName: string | null;
  detail: Record<string, unknown> | null;
}
