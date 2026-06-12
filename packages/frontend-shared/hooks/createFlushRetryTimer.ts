/**
 * flush 失敗時の再試行タイマー管理。多重スケジュールを防ぎ、
 * synced 到達時に clear できるようにする。
 */
export function createFlushRetryTimer(retryMs: number, onRetry: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clear() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  function schedule() {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      onRetry();
    }, retryMs);
  }

  return { clear, schedule };
}
