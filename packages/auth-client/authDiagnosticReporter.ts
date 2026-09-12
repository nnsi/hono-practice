import {
  type AuthDiagnosticEntry,
  type AuthDiagnosticReport,
  authDiagnosticEntrySchema,
  authDiagnosticReportSchema,
} from "@packages/types/authDiagnostics";

import {
  type AuthDiagnosticStorage,
  createAuthDiagnosticQueue,
} from "./authDiagnosticQueue";

type Options = {
  apiUrl: string;
  platform: "web" | "ios" | "android";
  appVersion?: string;
  updateId?: string;
  runtimeVersion?: string;
  createId?: () => string;
  storage?: AuthDiagnosticStorage;
};

/** Bounded, credential-free reports; transport/storage failures never affect auth. */
export function createAuthDiagnosticReporter(options: Options) {
  const createId = () => {
    try {
      return options.createId?.() ?? crypto.randomUUID();
    } catch {
      // Correlation IDs carry no authority. Older browsers may lack Web Crypto.
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const n = Math.floor(Math.random() * 16);
        return (char === "x" ? n : (n & 3) | 8).toString(16);
      });
    }
  };
  const flowId = createId();
  const breadcrumbs: AuthDiagnosticReport["breadcrumbs"] = [];
  const queue = createAuthDiagnosticQueue(options.storage);
  let sending: Promise<void> | null = null;
  let sendRequested = false;
  let nextSendAt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let activeRequest: AbortController | null = null;
  let disposed = false;
  const recent = new Map<string, number>();

  const clearRetry = () => {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
  };
  const scheduleRetry = () => {
    if (disposed || retryTimer !== null) return;
    const timer = setTimeout(
      () => {
        retryTimer = null;
        void flush();
      },
      Math.max(0, nextSendAt - Date.now()),
    );
    retryTimer = timer;
    // Node test/CLI processes need not stay alive solely to deliver diagnostics.
    if (
      typeof timer === "object" &&
      "unref" in timer &&
      typeof timer.unref === "function"
    )
      timer.unref();
  };
  const sendPending = async () => {
    const pending = await queue.list();
    if (disposed || pending.length === 0) {
      clearRetry();
      return;
    }
    if (Date.now() < nextSendAt) {
      scheduleRetry();
      return;
    }
    clearRetry();
    for (const report of pending) {
      if (disposed) return;
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);
      let delivered = false;
      try {
        // Deliberately use raw fetch, without auth refresh or cookies.
        const response = await fetch(
          `${options.apiUrl.replace(/\/+$/, "")}/client-errors`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "omit",
            signal: controller.signal,
            body: JSON.stringify({
              errorType: "auth_diagnostic",
              message: "Auth session diagnostic",
              platform: options.platform,
              appVersion: report.appVersion,
              diagnostic: report,
            }),
          },
        );
        delivered = response.ok;
      } catch {
        // Retry after the cooldown even if no further lifecycle event occurs.
      } finally {
        clearTimeout(timeout);
        activeRequest = null;
      }
      if (!delivered) {
        nextSendAt = Date.now() + 30_000;
        scheduleRetry();
        return;
      }
      await queue.acknowledge(report.eventId);
    }
  };
  const flush = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    sendRequested = true;
    if (sending) return sending;
    sending = (async () => {
      while (sendRequested && !disposed) {
        sendRequested = false;
        await sendPending();
      }
    })()
      .catch(() => {})
      .finally(() => {
        sending = null;
        if (sendRequested && !disposed) void flush();
      });
    return sending;
  };
  const observe = (input: AuthDiagnosticEntry): void => {
    try {
      if (disposed) return;
      const parsed = authDiagnosticEntrySchema.safeParse(input);
      if (!parsed.success) return;
      const entry = parsed.data;
      const at = new Date().toISOString();
      const shouldReport =
        entry.event === "session_cleared" ||
        entry.event === "reconcile_failed" ||
        (entry.event === "refresh_result" && entry.reason !== "ok") ||
        entry.reason === "storage_read_failed" ||
        entry.reason === "storage_write_retry" ||
        entry.reason === "storage_write_failed" ||
        entry.reason === "storage_clear_failed";
      const key = `${entry.event}:${entry.reason}:${entry.source}:${entry.status}`;
      const lastReportedAt = recent.get(key);
      if (
        shouldReport &&
        (lastReportedAt === undefined || Date.now() - lastReportedAt >= 60_000)
      ) {
        recent.set(key, Date.now());
        const candidate = {
          version: 1 as const,
          eventId: createId(),
          flowId,
          occurredAt: at,
          trigger: entry,
          breadcrumbs: breadcrumbs.slice(-8),
          updateId: options.updateId,
          appVersion: options.appVersion,
          runtimeVersion: options.runtimeVersion,
        };
        while (
          JSON.stringify(candidate).length > 2900 &&
          candidate.breadcrumbs.length
        ) {
          candidate.breadcrumbs.shift();
        }
        const report = authDiagnosticReportSchema.safeParse(candidate);
        if (report.success) {
          void queue
            .add(report.data)
            .then(flush)
            .catch(() => {});
        }
      }
      breadcrumbs.push({ ...entry, at });
      if (breadcrumbs.length > 8) breadcrumbs.shift();
      if (entry.event === "session_established" || entry.reason === "ok")
        void flush();
    } catch {
      // Includes faulty UUID providers and unavailable platform APIs.
    }
  };

  const dispose = () => {
    disposed = true;
    clearRetry();
    activeRequest?.abort();
  };

  return { observe, flowId, flush, dispose };
}
