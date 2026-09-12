import { z } from "zod";

// Credentials, user IDs, arbitrary URLs/messages and exception text never belong here.
export const authDiagnosticEntrySchema = z.object({
  event: z.enum([
    "hydrate",
    "refresh_started",
    "refresh_result",
    "refresh_retry",
    "storage_read",
    "storage_write",
    "storage_clear",
    "session_established",
    "session_cleared",
    "reconcile_failed",
    "refresh_callback",
    "http_unauthorized",
  ]),
  reason: z
    .enum([
      "local_session_present",
      "local_session_missing",
      "local_state_read_failed",
      "ok",
      "http_401",
      "http_403",
      "http_4xx",
      "http_5xx",
      "timeout",
      "network",
      "invalid_response",
      "missing_refresh_token",
      "missing_rotated_token",
      "storage_read_failed",
      "storage_write_retry",
      "storage_write_failed",
      "storage_clear_failed",
      "refresh_expired",
      "user_logout",
      "account_deleted",
      "forced_logout",
      "sync_failed",
      "apply_failed",
      "stale_result",
    ])
    .optional(),
  source: z
    .enum([
      "bootstrap",
      "reconcile",
      "api_401",
      "login",
      "register",
      "google",
      "apple",
      "external",
      "logout",
      "storage",
      "refresh",
      "account_delete",
    ])
    .optional(),
  requestId: z
    .string()
    .regex(/^[a-f0-9-]{8,36}$/)
    .optional(),
  status: z.number().int().min(100).max(599).optional(),
  attempt: z.number().int().min(1).max(2).optional(),
  durationMs: z.number().nonnegative().max(86_400_000).optional(),
  lastLoginAgeMs: z.number().nonnegative().max(31_536_000_000).optional(),
  hasLocalUser: z.boolean().optional(),
  hasLastLogin: z.boolean().optional(),
  wasLoggedIn: z.boolean().optional(),
  tokenSource: z
    .enum([
      "secure_store",
      "local_storage",
      "memory",
      "cookie",
      "bearer",
      "none",
    ])
    .optional(),
});

export type AuthDiagnosticEntry = z.infer<typeof authDiagnosticEntrySchema>;
export type AuthDiagnosticObserver = (entry: AuthDiagnosticEntry) => void;

export const authDiagnosticReportSchema = z
  .object({
    version: z.literal(1),
    eventId: z.string().uuid(),
    flowId: z.string().uuid(),
    occurredAt: z.string().datetime(),
    trigger: authDiagnosticEntrySchema,
    breadcrumbs: z
      .array(
        authDiagnosticEntrySchema.extend({
          at: z.string().datetime(),
        }),
      )
      .max(8),
    updateId: z.string().uuid().optional(),
    appVersion: z
      .string()
      .regex(/^[\w.-]{1,50}$/)
      .optional(),
    runtimeVersion: z
      .string()
      .regex(/^[\w.-]{1,50}$/)
      .optional(),
    // All permitted strings are ASCII, so serialized character and UTF-8 byte counts agree.
  })
  .refine((value) => JSON.stringify(value).length <= 3000);

export type AuthDiagnosticReport = z.infer<typeof authDiagnosticReportSchema>;

export const authServerDiagnosticSchema = z.object({
  version: z.literal(1),
  env: z.enum(["production", "stg", "development", "test", "unknown"]),
  platform: z.enum(["web", "ios", "android", "unknown"]),
  tokenSource: z.enum(["cookie", "bearer", "none"]),
  flowId: z.string().uuid().optional(),
  reason: z
    .enum([
      "malformed",
      "not_found",
      "revoked",
      "deleted",
      "hash_mismatch",
      "expired",
      "grace_expired",
      "race_lost",
      "rotated",
      "grace_used",
      "operation_replayed",
      "operation_mismatch",
      "recovery_expired",
      "recovery_closed",
      "missing",
      "user_not_found",
      "rotation_failed",
      "enrichment_failed",
      "response_invalid",
      "rate_limited",
    ])
    .optional(),
  stage: z.enum([
    "request",
    "rotation",
    "user_lookup",
    "token_issue",
    "token_persist",
    "enrich_user",
    "response",
  ]),
  rotationCommitted: z.boolean(),
});
export type AuthServerDiagnostic = z.infer<typeof authServerDiagnosticSchema>;
