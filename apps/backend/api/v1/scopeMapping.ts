import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";

type ResourceScope = Extract<ApiKeyScope, `${string}:${"read" | "write"}`>;
export type ResourceName =
  ResourceScope extends `${infer R}:${"read" | "write"}` ? R : never;

export type ScopeConfig =
  | { kind: "resource"; resource: ResourceName }
  | { kind: "fixed"; scope: ApiKeyScope };

export const V1_SCOPE_MAPPING: Record<string, ScopeConfig> = {
  "/activity-logs": { kind: "resource", resource: "activity-logs" },
  "/tasks": { kind: "resource", resource: "tasks" },
  "/ai/activity-logs": { kind: "fixed", scope: "voice" },
};

export function resolveScope(config: ScopeConfig, method: string): ApiKeyScope {
  if (config.kind === "fixed") return config.scope;
  const upper = method.toUpperCase();
  const suffix = upper === "GET" || upper === "HEAD" ? "read" : "write";
  return `${config.resource}:${suffix}`;
}

export function resolveScopeForPath(
  method: string,
  path: string,
): ApiKeyScope | null {
  for (const [prefix, config] of Object.entries(V1_SCOPE_MAPPING)) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return resolveScope(config, method);
    }
  }
  return null;
}
