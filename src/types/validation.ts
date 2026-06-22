export type ValidationRowStatus =
  | "pass"
  | "warn"
  | "fail"
  | "info"
  | "pending";

export interface ValidationRow {
  id: string;
  label: string;
  value: string;
  status: ValidationRowStatus;
}

export interface ValidationSummary {
  rows: ValidationRow[];
  exportReady: boolean;
  overallStatus: "pass" | "warn" | "fail";
}
