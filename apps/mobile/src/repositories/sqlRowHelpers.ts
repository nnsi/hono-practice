import type { SyncStatus } from "@packages/domain/sync/syncableRecord";

/**
 * Shared SQL row mapping helpers for snake_case → camelCase conversion.
 * Used across all mobile repositories.
 */

export type SqlBindable = string | number | null;

/**
 * Convert an unknown value to a SQLite-bindable primitive.
 * boolean → 0/1 (preserving the existing manual conversion pattern in repositories)
 * undefined/null → null
 * string/number → as-is
 * other → String(value)
 */
export function toSqlBindable(value: unknown): SqlBindable {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value);
}

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * 空文字列はそのまま返し、null/undefined のみ null に変換する。
 * 空文字列を null に変換したい場合はこの関数を使わないこと。
 */
export function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed" || v === "rejected")
    return v;
  return "synced";
}
