import { z } from "zod";

/**
 * サーバーに保存・送受信できるタブキー。
 * "daily" は Actiko 画面へ統合して廃止したが、統合前のクライアントが送ってくるので受理し続ける。
 */
export const STORED_TAB_KEYS = [
  "home",
  "daily",
  "stats",
  "goals",
  "tasks",
  "notes",
] as const;

/** 廃止済みのタブキー。保存値としては有効だが、現行クライアントは表示しない。 */
export const RETIRED_TAB_KEYS = ["daily"] as const;

/** 現行クライアントが表示できるタブキー。 */
export const TAB_KEYS = ["home", "stats", "goals", "tasks", "notes"] as const;

/** 統合前クライアントとの互換のため、保存値の既定は "daily" を含んだままにする。 */
export const DEFAULT_STORED_TAB_KEYS = [
  "home",
  "daily",
  "stats",
  "goals",
  "tasks",
] as const;

export const DEFAULT_TAB_KEYS = ["home", "stats", "goals", "tasks"] as const;

export const TAB_SLOTS = 5;
export const CUSTOMIZABLE_TAB_SLOTS = TAB_SLOTS - 1;
export const FIXED_TAB_KEY = "home" as const;

export const storedTabKeySchema = z.enum(STORED_TAB_KEYS);
export type StoredTabKey = z.infer<typeof storedTabKeySchema>;
export type TabKey = (typeof TAB_KEYS)[number];

function isStoredTabKey(value: unknown): value is StoredTabKey {
  return STORED_TAB_KEYS.some((tabKey) => tabKey === value);
}

function isTabKey(value: StoredTabKey): value is TabKey {
  return !RETIRED_TAB_KEYS.some((retired) => retired === value);
}

function hasValidTabOrder(
  tabs: readonly unknown[],
): tabs is readonly StoredTabKey[] {
  if (tabs.length < 1 || tabs.length > TAB_SLOTS) return false;
  if (tabs[0] !== FIXED_TAB_KEY) return false;

  const uniqueTabs = new Set(tabs);
  if (uniqueTabs.size !== tabs.length) return false;

  return tabs.every(isStoredTabKey);
}

/** 保存値としての正規化（廃止キーは落とさない）。サーバーと保存層が使う。 */
export function normalizeStoredTabKeys(value: unknown): StoredTabKey[] {
  if (!Array.isArray(value) || !hasValidTabOrder(value)) {
    return [...DEFAULT_STORED_TAB_KEYS];
  }
  return [...value];
}

/** 表示用の正規化。保存値として検証したうえで廃止キーを落とす。 */
export function normalizeTabKeys(value: unknown): TabKey[] {
  return normalizeStoredTabKeys(value).filter(isTabKey);
}

export const tabPreferenceSchema = z.object({
  tabs: z.array(storedTabKeySchema).superRefine((tabs, ctx) => {
    if (tabs.length < 1 || tabs.length > TAB_SLOTS) {
      ctx.addIssue({
        code: "custom",
        message: `tabs must contain between 1 and ${TAB_SLOTS} items`,
      });
      return;
    }
    if (tabs[0] !== FIXED_TAB_KEY) {
      ctx.addIssue({
        code: "custom",
        message: "home must stay in the first position",
      });
    }
    if (new Set(tabs).size !== tabs.length) {
      ctx.addIssue({
        code: "custom",
        message: "tabs must be unique",
      });
    }
  }),
  updatedAt: z.string().datetime(),
});

/** サーバーと送受信するタブ設定。tabs は廃止キーを含みうる。 */
export type TabPreference = z.infer<typeof tabPreferenceSchema>;

export const localTabPreferenceSchema = tabPreferenceSchema.extend({
  syncStatus: z.enum(["synced", "pending"]).default("synced"),
});

/** クライアントが保持するタブ設定。tabs は表示できるキーだけを持つ。 */
export type LocalTabPreference = {
  tabs: TabKey[];
  updatedAt: string;
  syncStatus: "synced" | "pending";
};

export function getHiddenTabKeys(tabs: readonly StoredTabKey[]): TabKey[] {
  const visibleTabs = normalizeTabKeys(tabs);
  return TAB_KEYS.filter((key) => !visibleTabs.includes(key));
}

export function canAddVisibleTab(tabs: readonly StoredTabKey[]) {
  return normalizeTabKeys(tabs).length < TAB_SLOTS;
}

export function reorderTabKeys(
  tabs: readonly StoredTabKey[],
  fromIndex: number,
  toIndex: number,
): TabKey[] {
  const visibleTabs = normalizeTabKeys(tabs);
  if (
    fromIndex <= 0 ||
    fromIndex >= visibleTabs.length ||
    toIndex <= 0 ||
    toIndex >= visibleTabs.length
  ) {
    return visibleTabs;
  }

  const next = [...visibleTabs];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function hideTabKey(
  tabs: readonly StoredTabKey[],
  key: TabKey,
): TabKey[] {
  const visibleTabs = normalizeTabKeys(tabs);
  if (key === FIXED_TAB_KEY || !visibleTabs.includes(key)) {
    return visibleTabs;
  }
  return visibleTabs.filter((current) => current !== key);
}

export function showTabKey(
  tabs: readonly StoredTabKey[],
  key: TabKey,
): TabKey[] | undefined {
  const visibleTabs = normalizeTabKeys(tabs);
  if (visibleTabs.includes(key)) {
    return visibleTabs;
  }
  if (visibleTabs.length >= TAB_SLOTS) {
    return undefined;
  }
  return [...visibleTabs, key];
}

export function createDefaultTabPreference(): TabPreference {
  return {
    tabs: [...DEFAULT_STORED_TAB_KEYS],
    updatedAt: new Date(0).toISOString(),
  };
}

export function createDefaultLocalTabPreference(): LocalTabPreference {
  return {
    tabs: [...DEFAULT_TAB_KEYS],
    updatedAt: createDefaultTabPreference().updatedAt,
    syncStatus: "synced",
  };
}

export function coerceTabPreference(value: unknown): TabPreference {
  const parsed = tabPreferenceSchema.safeParse(value);
  if (!parsed.success) {
    return createDefaultTabPreference();
  }
  return {
    tabs: normalizeStoredTabKeys(parsed.data.tabs),
    updatedAt: parsed.data.updatedAt,
  };
}

export function coerceLocalTabPreference(value: unknown): LocalTabPreference {
  const parsed = localTabPreferenceSchema.safeParse(value);
  if (!parsed.success) {
    return createDefaultLocalTabPreference();
  }
  return {
    tabs: normalizeTabKeys(parsed.data.tabs),
    updatedAt: parsed.data.updatedAt,
    syncStatus: parsed.data.syncStatus,
  };
}

export function markTabPreferencePending(
  tabs: readonly StoredTabKey[],
  now = new Date(),
): LocalTabPreference {
  return {
    tabs: normalizeTabKeys(tabs),
    updatedAt: now.toISOString(),
    syncStatus: "pending",
  };
}

export function applyServerTabPreference(
  current: LocalTabPreference,
  server: TabPreference,
): LocalTabPreference {
  if (
    current.syncStatus === "pending" &&
    new Date(current.updatedAt) > new Date(server.updatedAt)
  ) {
    return current;
  }
  return {
    tabs: normalizeTabKeys(server.tabs),
    updatedAt: server.updatedAt,
    syncStatus: "synced",
  };
}
