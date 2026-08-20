import {
  type LocalTabPreference,
  coerceLocalTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";

import type { TabPreferenceStorage } from "./createTabPreferenceStore.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * settingsKey に保存された JSON オブジェクト全体を読み出す。
 * 壊れていれば空オブジェクトを返す（tabPreference 以外の設定を保つため
 * 部分更新時に既存キーをマージする必要がある）。
 */
async function readSettingsObject(
  storage: TabPreferenceStorage,
  settingsKey: string,
): Promise<Record<string, unknown>> {
  const raw = await storage.getItem(settingsKey);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** 既存の設定をマージしつつ tabPreference のみ書き換える。 */
export async function writeTabPreference(
  storage: TabPreferenceStorage,
  settingsKey: string,
  preference: LocalTabPreference,
): Promise<void> {
  const settings = await readSettingsObject(storage, settingsKey);
  await storage.setItem(
    settingsKey,
    JSON.stringify({ ...settings, tabPreference: preference }),
  );
}

/** 他の設定を保ったまま tabPreference キーだけ削除する。 */
export async function clearTabPreference(
  storage: TabPreferenceStorage,
  settingsKey: string,
): Promise<void> {
  const settings = await readSettingsObject(storage, settingsKey);
  delete settings.tabPreference;
  await storage.setItem(settingsKey, JSON.stringify(settings));
}

/** storage から tabPreference を読み、coerce して返す。 */
export async function loadTabPreference(
  storage: TabPreferenceStorage,
  settingsKey: string,
): Promise<LocalTabPreference> {
  const settings = await readSettingsObject(storage, settingsKey);
  return coerceLocalTabPreference(settings.tabPreference);
}
