import type {
  AuthDiagnosticEntry,
  AuthDiagnosticObserver,
} from "@packages/types/authDiagnostics";

/** Observability must never change authentication outcomes. */
export function emitAuthDiagnostic(
  observer: AuthDiagnosticObserver | undefined,
  entry: AuthDiagnosticEntry,
): void {
  try {
    observer?.(entry);
  } catch {
    // A broken observer cannot expire a session or break token rotation.
  }
}
