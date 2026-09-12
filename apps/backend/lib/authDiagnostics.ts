import {
  type AuthServerDiagnostic,
  authServerDiagnosticSchema,
} from "@packages/types/authDiagnostics";

export type AuthDiagnosticUpdate = Partial<
  Pick<
    AuthServerDiagnostic,
    "reason" | "stage" | "rotationCommitted" | "tokenSource"
  >
>;
export type AuthDiagnosticObserver = (update: AuthDiagnosticUpdate) => void;
export type AuthDiagnosticCollector = {
  observe: AuthDiagnosticObserver;
  snapshot: () => AuthServerDiagnostic;
};

export function normalizeAuthEnvironment(
  value?: string,
): AuthServerDiagnostic["env"] {
  switch (value) {
    case "production":
    case "stg":
    case "development":
    case "test":
      return value;
    default:
      return "unknown";
  }
}

/** Observability must never change credential validation or transaction outcomes. */
export function recordAuthDiagnostic(
  observer: AuthDiagnosticObserver | undefined,
  update: AuthDiagnosticUpdate,
): void {
  try {
    observer?.(update);
  } catch {
    // Best effort; never include the thrown value in another diagnostic.
  }
}

export function createAuthDiagnosticCollector(input: {
  environment?: string;
  platform?: string;
  flowId?: string;
  hasOrigin: boolean;
}): AuthDiagnosticCollector {
  const platform =
    input.platform === "ios" ||
    input.platform === "android" ||
    input.platform === "web"
      ? input.platform
      : input.platform === undefined && input.hasOrigin
        ? "web"
        : "unknown";
  const flowId = authServerDiagnosticSchema.shape.flowId.safeParse(
    input.flowId,
  );
  let value: AuthServerDiagnostic = {
    version: 1,
    env: normalizeAuthEnvironment(input.environment),
    platform,
    tokenSource: "none",
    ...(flowId.success && flowId.data ? { flowId: flowId.data } : {}),
    stage: "request",
    rotationCommitted: false,
  };
  return {
    observe(update) {
      const parsed = authServerDiagnosticSchema.safeParse({
        ...value,
        ...update,
      });
      if (parsed.success) value = parsed.data;
    },
    snapshot: () => ({ ...value }),
  };
}

export function serializeAuthDiagnostic(value: unknown): string {
  const parsed = authServerDiagnosticSchema.safeParse(value);
  return parsed.success ? JSON.stringify(parsed.data) : "";
}
