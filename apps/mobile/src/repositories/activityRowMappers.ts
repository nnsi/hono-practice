import type { SyncStatus } from "@packages/domain";
import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import {
  RECORDING_MODES,
  type RecordingMode,
} from "@packages/domain/activity/recordingMode";
import type { Syncable } from "@packages/domain/sync/syncableRecord";

export type SqlRow = Record<string, unknown>;

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

type IconType = "emoji" | "upload";
const VALID_ICON_TYPES = new Set<string>(["emoji", "upload"]);

function isIconType(v: string): v is IconType {
  return VALID_ICON_TYPES.has(v);
}

function toIconType(v: unknown): IconType {
  if (typeof v === "string" && isIconType(v)) return v;
  return "emoji";
}

const VALID_RECORDING_MODES: ReadonlySet<string> = new Set(RECORDING_MODES);

function isRecordingMode(v: string): v is RecordingMode {
  return VALID_RECORDING_MODES.has(v);
}

function toRecordingMode(v: unknown): RecordingMode {
  if (typeof v === "string" && isRecordingMode(v)) return v;
  return "manual";
}

function toSyncStatus(v: unknown): SyncStatus {
  if (v === "pending" || v === "synced" || v === "failed" || v === "rejected")
    return v;
  return "synced";
}

export function mapActivityRow(row: SqlRow): Syncable<ActivityRecord> {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    name: str(row.name),
    label: str(row.label),
    emoji: str(row.emoji),
    iconType: toIconType(row.icon_type),
    iconUrl: strOrNull(row.icon_url),
    iconThumbnailUrl: strOrNull(row.icon_thumbnail_url),
    description: str(row.description),
    quantityUnit: str(row.quantity_unit),
    orderIndex: str(row.order_index),
    showCombinedStats: row.show_combined_stats === 1,
    recordingMode: toRecordingMode(row.recording_mode),
    recordingModeConfig: strOrNull(row.recording_mode_config),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

export function mapActivityKindRow(row: SqlRow): Syncable<ActivityKindRecord> {
  return {
    id: str(row.id),
    activityId: str(row.activity_id),
    name: str(row.name),
    color: strOrNull(row.color),
    orderIndex: str(row.order_index),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    deletedAt: strOrNull(row.deleted_at),
    _syncStatus: toSyncStatus(row.sync_status),
  };
}

export const activityColumnMap: Record<string, string> = {
  name: "name",
  label: "label",
  emoji: "emoji",
  iconType: "icon_type",
  iconUrl: "icon_url",
  iconThumbnailUrl: "icon_thumbnail_url",
  description: "description",
  quantityUnit: "quantity_unit",
  orderIndex: "order_index",
  showCombinedStats: "show_combined_stats",
  recordingMode: "recording_mode",
  recordingModeConfig: "recording_mode_config",
  updatedAt: "updated_at",
  _syncStatus: "sync_status",
  deletedAt: "deleted_at",
};

export const kindColumnMap: Record<string, string> = {
  name: "name",
  color: "color",
  orderIndex: "order_index",
  updatedAt: "updated_at",
  _syncStatus: "sync_status",
  deletedAt: "deleted_at",
};
