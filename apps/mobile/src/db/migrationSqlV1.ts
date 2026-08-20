// =============================================================================
// WARNING: Native widget schema coupling
//
// The iOS and Android widgets read this SQLite DB directly via raw SQL.
// The following tables and columns are referenced by widget native code.
// If you rename or remove any of these, you MUST update the corresponding
// native file(s) as well — the widgets will silently crash or return wrong
// data at runtime with no compile-time error.
//
// Referenced tables and columns:
//
//   activities
//     id, user_id, name, emoji, quantity_unit, recording_mode,
//     recording_mode_config, deleted_at, order_index
//
//   activity_kinds
//     id, activity_id, name, color, deleted_at, order_index
//
//   activity_logs
//     id, activity_id, activity_kind_id, quantity, memo, date, time,
//     task_id, sync_status, deleted_at, created_at, updated_at
//
//   auth_state
//     id, user_id, plan
//
// Native files that MUST be kept in sync:
//   - apps/mobile/targets/widget/WidgetDbHelper.swift
//   - apps/mobile/targets/widget/WidgetDbQueries.swift
//   - apps/mobile/modules/timer-widget/android/src/main/java/com/actiko/widget/WidgetDbHelper.kt
//   - apps/mobile/modules/timer-widget/android/src/main/java/com/actiko/widget/WidgetLogHelper.kt
//
// Verified by: scripts/check-widget-schema.js (run via pnpm run check-widget-schema)
// =============================================================================

export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '',
  icon_type TEXT NOT NULL DEFAULT 'emoji',
  icon_url TEXT,
  icon_thumbnail_url TEXT,
  description TEXT NOT NULL DEFAULT '',
  quantity_unit TEXT NOT NULL DEFAULT '',
  order_index TEXT NOT NULL DEFAULT '',
  show_combined_stats INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_kinds (
  id TEXT PRIMARY KEY NOT NULL,
  activity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  order_index TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'synced',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_kinds_activity_id ON activity_kinds(activity_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY NOT NULL,
  activity_id TEXT NOT NULL,
  activity_kind_id TEXT,
  quantity REAL,
  memo TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  time TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_id ON activity_logs(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  activity_id TEXT NOT NULL,
  daily_target_quantity REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL DEFAULT '',
  sync_status TEXT NOT NULL DEFAULT 'synced',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goals_activity_id ON goals(activity_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  start_date TEXT,
  due_date TEXT,
  done_date TEXT,
  memo TEXT NOT NULL DEFAULT '',
  archived_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE TABLE IF NOT EXISTS activity_icon_blobs (
  activity_id TEXT PRIMARY KEY NOT NULL,
  base64 TEXT NOT NULL,
  mime_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_icon_delete_queue (
  activity_id TEXT PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_state (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'current',
  user_id TEXT,
  last_login_at TEXT
);
`;

export const MIGRATION_V2 = `
ALTER TABLE activity_icon_blobs ADD COLUMN synced INTEGER DEFAULT 0;
`;

export const MIGRATION_V3 = `
ALTER TABLE activities ADD COLUMN recording_mode TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE activities ADD COLUMN recording_mode_config TEXT;
UPDATE activities SET recording_mode = 'timer'
WHERE recording_mode = 'manual'
  AND (
    LOWER(quantity_unit) LIKE '%時%'
    OR LOWER(quantity_unit) LIKE '%分%'
    OR LOWER(quantity_unit) LIKE '%秒%'
    OR LOWER(quantity_unit) LIKE '%hour%'
    OR LOWER(quantity_unit) LIKE '%min%'
    OR LOWER(quantity_unit) LIKE '%sec%'
    OR LOWER(quantity_unit) LIKE '%時間%'
  );
`;

export const MIGRATION_V4 = `
ALTER TABLE goals ADD COLUMN debt_cap REAL;
`;

export const MIGRATION_V5 = `
CREATE TABLE IF NOT EXISTS goal_freeze_periods (
  id TEXT PRIMARY KEY NOT NULL,
  goal_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goal_freeze_periods_goal_id ON goal_freeze_periods(goal_id);
`;

export const MIGRATION_V6 = `
ALTER TABLE goals ADD COLUMN day_targets TEXT;
`;
