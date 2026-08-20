export type StartupRouteKind = "unresolved" | "default" | "explicit";

/** Explicit deep links must win over the optional startup preference. */
export function classifyStartupRoute(
  segments: readonly string[],
): StartupRouteKind {
  if (segments.length === 0) return "unresolved";
  if (segments.length === 1 && segments[0] === "(tabs)") return "default";
  return "explicit";
}

function hasShowGoalPreference(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "showGoalOnStartup" in value &&
    value.showGoalOnStartup === true
  );
}

export function readShowGoalPreference(raw: string | null): Promise<boolean> {
  if (!raw) return Promise.resolve(false);
  return Promise.resolve(raw)
    .then(JSON.parse)
    .then((value: unknown) => hasShowGoalPreference(value))
    .catch(() => false);
}
