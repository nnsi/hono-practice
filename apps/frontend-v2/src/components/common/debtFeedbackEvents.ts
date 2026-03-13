import type { DebtFeedbackResult } from "@packages/domain/goal/goalDebtFeedback";

type Listener = (result: DebtFeedbackResult) => void;
const listeners = new Set<Listener>();

export function emitDebtFeedback(result: DebtFeedbackResult) {
  for (const listener of listeners) listener(result);
}

export function onDebtFeedback(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
