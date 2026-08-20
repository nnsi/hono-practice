import type { StorageAdapter } from "@packages/platform";

export const LAST_SYNCED_KEY = "actiko-v2-lastSyncedAt";
export const BOOTSTRAPPED_RESOURCES_KEY = "actiko-v2-bootstrappedResources";

export type DeltaSyncResource =
  | "logs"
  | "goals"
  | "freezePeriods"
  | "tasks"
  | "notes";

export function readBootstrappedResources(
  storage: StorageAdapter,
  fallback: readonly DeltaSyncResource[],
): Set<DeltaSyncResource> {
  const raw = storage.getItem(BOOTSTRAPPED_RESOURCES_KEY);
  if (!raw) return new Set(fallback);

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(fallback);
    return new Set(
      parsed.filter(
        (resource): resource is DeltaSyncResource =>
          typeof resource === "string",
      ),
    );
  } catch {
    return new Set(fallback);
  }
}

export function writeBootstrappedResources(
  storage: StorageAdapter,
  resources: Iterable<DeltaSyncResource>,
): void {
  storage.setItem(
    BOOTSTRAPPED_RESOURCES_KEY,
    JSON.stringify([...new Set(resources)]),
  );
}
