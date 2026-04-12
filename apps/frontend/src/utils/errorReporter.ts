import {
  type ErrorReport,
  type ReportErrorOptions,
  reportError as reportErrorShared,
} from "@packages/frontend-shared";

import { db } from "../db/schema";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

type ErrorReporterState = {
  cachedUserId: string;
  registeredDb: typeof db | null;
  creatingHook: ((primKey: string, obj: AuthStateRecord) => void) | null;
  updatingHook:
    | ((
        modifications: Partial<AuthStateRecord>,
        primKey: string,
        obj: AuthStateRecord,
      ) => void)
    | null;
};

type AuthStateRecord = {
  userId: string;
  lastLoginAt: string;
};

type GlobalErrorReporterState = typeof globalThis & {
  __actikoWebErrorReporterState__?: ErrorReporterState;
};

function getErrorReporterState(): ErrorReporterState {
  const scope = globalThis as GlobalErrorReporterState;
  if (!scope.__actikoWebErrorReporterState__) {
    scope.__actikoWebErrorReporterState__ = {
      cachedUserId: "",
      registeredDb: null,
      creatingHook: null,
      updatingHook: null,
    };
  }
  return scope.__actikoWebErrorReporterState__;
}

function syncCachedUserId(
  state: ErrorReporterState,
  authState: AuthStateRecord | null | undefined,
): void {
  state.cachedUserId = authState?.lastLoginAt ? authState.userId : "";
}

function ensureAuthStateTracking(): ErrorReporterState {
  const activeDb = db;
  const state = getErrorReporterState();
  if (state.registeredDb === activeDb) return state;

  if (state.registeredDb && state.creatingHook) {
    state.registeredDb.authState
      .hook("creating")
      .unsubscribe(state.creatingHook);
  }
  if (state.registeredDb && state.updatingHook) {
    state.registeredDb.authState
      .hook("updating")
      .unsubscribe(state.updatingHook);
  }

  state.registeredDb = activeDb;
  state.cachedUserId = "";

  void activeDb.authState
    .get("current")
    .then((authState) => {
      if (state.registeredDb !== activeDb) return;
      syncCachedUserId(state, authState);
    })
    .catch(() => {});

  state.creatingHook = (_primKey, obj) => {
    syncCachedUserId(state, obj);
  };
  state.updatingHook = (modifications, _primKey, obj) => {
    const merged = { ...obj, ...modifications };
    syncCachedUserId(state, merged);
  };

  activeDb.authState.hook("creating", state.creatingHook);
  activeDb.authState.hook("updating", state.updatingHook);

  return state;
}

export const webReportErrorOptions: ReportErrorOptions = {
  apiUrl: API_URL,
  platform: "web",
  getContext: () => ({
    screen: window.location.pathname,
    userId: ensureAuthStateTracking().cachedUserId || undefined,
  }),
};

export function reportError(report: ErrorReport): void {
  reportErrorShared(report, webReportErrorOptions);
}
