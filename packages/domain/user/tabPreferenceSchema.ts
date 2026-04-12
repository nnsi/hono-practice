import { z } from "zod";

export const TAB_KEYS = [
  "home",
  "daily",
  "stats",
  "goals",
  "tasks",
  "notes",
] as const;

export const DEFAULT_TAB_KEYS = [
  "home",
  "daily",
  "stats",
  "goals",
  "tasks",
] as const;

export const TAB_SLOTS = DEFAULT_TAB_KEYS.length;
export const CUSTOMIZABLE_TAB_SLOTS = TAB_SLOTS - 1;
export const FIXED_TAB_KEY = "home" as const;

export const tabKeySchema = z.enum(TAB_KEYS);
export type TabKey = z.infer<typeof tabKeySchema>;

function isTabKey(value: unknown): value is TabKey {
  return TAB_KEYS.some((tabKey) => tabKey === value);
}

function hasValidTabOrder(tabs: readonly unknown[]): tabs is readonly TabKey[] {
  if (tabs.length < 1 || tabs.length > TAB_SLOTS) return false;
  if (tabs[0] !== FIXED_TAB_KEY) return false;

  const uniqueTabs = new Set(tabs);
  if (uniqueTabs.size !== tabs.length) return false;

  return tabs.every(isTabKey);
}

export function normalizeTabKeys(value: unknown): TabKey[] {
  if (!Array.isArray(value) || !hasValidTabOrder(value)) {
    return [...DEFAULT_TAB_KEYS];
  }
  return [...value];
}

export const tabPreferenceSchema = z.object({
  tabs: z.array(tabKeySchema).superRefine((tabs, ctx) => {
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

export type TabPreference = z.infer<typeof tabPreferenceSchema>;

export const localTabPreferenceSchema = tabPreferenceSchema.extend({
  syncStatus: z.enum(["synced", "pending"]).default("synced"),
});

export type LocalTabPreference = z.infer<typeof localTabPreferenceSchema>;

export function getHiddenTabKeys(tabs: readonly TabKey[]): TabKey[] {
  const visibleTabs = normalizeTabKeys(tabs);
  return TAB_KEYS.filter((key) => !visibleTabs.includes(key));
}

export function canAddVisibleTab(tabs: readonly TabKey[]) {
  return normalizeTabKeys(tabs).length < TAB_SLOTS;
}

export function reorderTabKeys(
  tabs: readonly TabKey[],
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

export function hideTabKey(tabs: readonly TabKey[], key: TabKey): TabKey[] {
  const visibleTabs = normalizeTabKeys(tabs);
  if (key === FIXED_TAB_KEY || !visibleTabs.includes(key)) {
    return visibleTabs;
  }
  return visibleTabs.filter((current) => current !== key);
}

export function showTabKey(
  tabs: readonly TabKey[],
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
    tabs: [...DEFAULT_TAB_KEYS],
    updatedAt: new Date(0).toISOString(),
  };
}

export function createDefaultLocalTabPreference(): LocalTabPreference {
  return {
    ...createDefaultTabPreference(),
    syncStatus: "synced",
  };
}

export function coerceTabPreference(value: unknown): TabPreference {
  const parsed = tabPreferenceSchema.safeParse(value);
  if (!parsed.success) {
    return createDefaultTabPreference();
  }
  return {
    tabs: normalizeTabKeys(parsed.data.tabs),
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
  tabs: readonly TabKey[],
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
