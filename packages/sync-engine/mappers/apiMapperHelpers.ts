import {
  RECORDING_MODES,
  type RecordingMode,
} from "@packages/domain/activity/recordingMode";

import { getServerNowISOString } from "../core/serverTime";

// Loose record type for API responses — mappers use `??` to handle both null and undefined
export type ApiRecord = Record<string, unknown> & { id: string };

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function toISOString(v: unknown): string {
  return typeof v === "string" ? v : getServerNowISOString();
}

export function toBool(v: unknown, defaultValue: boolean): boolean {
  if (typeof v === "boolean") return v;
  return defaultValue;
}

export function toNum(v: unknown, defaultValue: number): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? defaultValue : n;
}

export function toNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

const VALID_ICON_TYPES = new Set(["emoji", "upload", "generate"]);
type IconType = "emoji" | "upload" | "generate";

export function isIconType(value: string): value is IconType {
  return VALID_ICON_TYPES.has(value);
}

export function toIconType(value: unknown): IconType {
  if (typeof value === "string" && isIconType(value)) {
    return value;
  }
  return "emoji";
}

const VALID_RECORDING_MODES: ReadonlySet<string> = new Set(RECORDING_MODES);

export function isRecordingMode(value: string): value is RecordingMode {
  return VALID_RECORDING_MODES.has(value);
}

export function toRecordingMode(value: unknown): RecordingMode {
  if (typeof value === "string" && isRecordingMode(value)) {
    return value;
  }
  return "manual";
}
