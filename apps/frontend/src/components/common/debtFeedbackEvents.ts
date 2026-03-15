import type { DebtFeedbackResult } from "@packages/domain/goal/goalDebtFeedback";

type Listener = (results: DebtFeedbackResult[]) => void;
const listeners = new Set<Listener>();

export function emitDebtFeedback(results: DebtFeedbackResult[]) {
  if (results.length === 0) return;
  for (const listener of listeners) listener(results);
}

export function onDebtFeedback(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
