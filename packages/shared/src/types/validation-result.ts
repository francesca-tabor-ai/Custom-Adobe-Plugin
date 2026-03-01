export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationItem {
  ruleId: string;
  severity: ValidationSeverity;
  /** Human-readable element reference (e.g. layer name, text frame label, page number) */
  elementRef: string;
  message: string;
  /** Optional suggested fix description */
  suggestedFix?: string;
  /** Extra data for programmatic use (e.g. actual color hex, expected hex) */
  meta?: Record<string, unknown>;
}

export interface ValidationResult {
  passed: boolean;
  checkedAt: string;
  items: ValidationItem[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export type ApplyResult = {
  success: boolean;
  details: string[];
};

export type PlaceResult = {
  success: boolean;
  elementRef: string | null;
  detail: string;
};
