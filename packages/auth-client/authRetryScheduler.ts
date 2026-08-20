import type { OnlineRetryAdapter } from "./types";

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export function newAuthRetryScheduler(online?: OnlineRetryAdapter) {
  let onlineCleanup: (() => void) | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryAttempt = 0;

  const clear = () => {
    if (onlineCleanup) {
      onlineCleanup();
      onlineCleanup = null;
    }
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const reset = () => {
    clear();
    retryAttempt = 0;
  };

  const schedule = (handler: () => void) => {
    clear();
    const delay = Math.min(BASE_DELAY_MS * 2 ** retryAttempt, MAX_DELAY_MS);
    retryAttempt++;
    let armed = false;
    const retry = () => {
      // NetInfo は購読直後に現在値を通知し得る。登録完了前の snapshot は無視する。
      if (!armed) return;
      clear();
      handler();
    };

    retryTimer = setTimeout(retry, delay);
    if (online) onlineCleanup = online.registerOnlineRetry(retry);
    armed = true;
  };

  return { clear, reset, schedule };
}
