// V1–V6 are in migrationSqlV1.ts.
// ⚠️  IMPORTANT: The iOS and Android widgets read this SQLite DB directly.
// See the WARNING block at the top of migrationSqlV1.ts for the full list of
// widget-referenced tables/columns. Changing those requires updating native
// WidgetDbHelper files. Enforced by: scripts/check-widget-schema.js
export {
  MIGRATION_V1,
  MIGRATION_V2,
  MIGRATION_V3,
  MIGRATION_V4,
  MIGRATION_V5,
  MIGRATION_V6,
} from "./migrationSqlV1";

export const MIGRATION_V7 = `
ALTER TABLE tasks ADD COLUMN activity_id TEXT;
`;

export const MIGRATION_V8 = `
ALTER TABLE tasks ADD COLUMN activity_kind_id TEXT;
ALTER TABLE tasks ADD COLUMN quantity REAL;
`;

export const MIGRATION_V9 = `
ALTER TABLE activity_logs ADD COLUMN task_id TEXT;
`;

export const MIGRATION_V10 = `
ALTER TABLE auth_state ADD COLUMN plan TEXT DEFAULT 'free';
`;

export const MIGRATION_V11 = `
CREATE TABLE IF NOT EXISTS note (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  activity_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_note_user_id ON note(user_id);
CREATE INDEX IF NOT EXISTS idx_note_activity_id ON note(activity_id);
CREATE INDEX IF NOT EXISTS idx_note_updated_at ON note(updated_at);
`;

export const MIGRATION_V12 = `
ALTER TABLE auth_state ADD COLUMN tutorial_status TEXT;
`;

export const MIGRATION_V13 = `
CREATE TABLE IF NOT EXISTS task_schedules (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  activity_id TEXT,
  activity_kind_id TEXT,
  quantity REAL,
  title TEXT NOT NULL,
  memo TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  recurrence_type TEXT NOT NULL,
  interval_days INTEGER,
  weekdays TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_task_schedules_sync_status ON task_schedules(sync_status);
CREATE INDEX IF NOT EXISTS idx_task_schedules_activity_id ON task_schedules(activity_id);
CREATE INDEX IF NOT EXISTS idx_task_schedules_updated_at ON task_schedules(updated_at);
ALTER TABLE tasks ADD COLUMN schedule_id TEXT;
ALTER TABLE tasks ADD COLUMN scheduled_date TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_schedule_id_scheduled_date ON tasks(schedule_id, scheduled_date);
`;
