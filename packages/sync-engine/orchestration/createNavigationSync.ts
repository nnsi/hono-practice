import type { SyncMutex } from "./createSyncMutex";

type NavigationSyncDeps = {
  syncAll: () => Promise<void>;
  pullSync: () => Promise<void>;
  isOnline: () => boolean;
  mutex: SyncMutex;
  onError?: (error: unknown, phase: "pull" | "push") => void;
};

export type NavigationSyncResult = {
  /** pull が実行されたか。mutex が待機上限まで空かなかったときは false */
  pulled: boolean;
};

export type NavigationSync = {
  /**
   * pull → push を fire-and-forget で実行する。直近の pull 成功から 5 秒以内は
   * 間引く。画面遷移・フォアグラウンド復帰・タブ表示・オンライン復帰など
   * 自動トリガー向け。
   */
  trigger: () => void;
  /**
   * pull → push を実行し完了まで待つ。間引きは行わない。
   * pull-to-refresh など明示操作向け。
   */
  run: () => Promise<NavigationSyncResult>;
};

const THROTTLE_MS = 5000;
const MUTEX_WAIT_STEP_MS = 100;
const MUTEX_WAIT_MAX_MS = 10000;

// Why: pull を起こす経路は画面遷移・復帰・明示更新だけで、push と違い定期
// 実行で拾い直せない。mutex 使用中（startAutoSync の push など）に
// ADR 20260321 のとおりスキップすると pull が無音で失われるため、pull だけは
// 上限付きで解放を待って再試行する。同時に走る要求は 1 本に合流させるので
// キューが溜まることはない。
export function createNavigationSync(deps: NavigationSyncDeps): NavigationSync {
  let lastPulledAt = 0;
  let inFlight: Promise<NavigationSyncResult> | null = null;

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  // mutex.run は busy なら fn を実行せず undefined を返す。true が返るまで
  // 再試行することで、isBusy() の観測と取得の間に割り込まれても取りこぼさない。
  const pullWithWait = async (): Promise<boolean> => {
    const deadline = Date.now() + MUTEX_WAIT_MAX_MS;
    for (;;) {
      const acquired = await deps.mutex.run(async () => {
        await deps.pullSync();
        return true as const;
      });
      if (acquired) return true;
      if (Date.now() >= deadline) return false;
      await sleep(MUTEX_WAIT_STEP_MS);
    }
  };

  const execute = async (): Promise<NavigationSyncResult> => {
    let pulled = false;
    try {
      pulled = await pullWithWait();
      if (pulled) lastPulledAt = Date.now();
    } catch (err) {
      deps.onError?.(err, "pull");
    }
    try {
      await deps.syncAll();
    } catch (err) {
      deps.onError?.(err, "push");
    }
    return { pulled };
  };

  const start = (): Promise<NavigationSyncResult> => {
    if (!inFlight) {
      inFlight = execute().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };

  return {
    trigger(): void {
      if (inFlight) return;
      if (Date.now() - lastPulledAt < THROTTLE_MS) return;
      if (!deps.isOnline()) return;
      void start();
    },
    async run(): Promise<NavigationSyncResult> {
      if (!deps.isOnline()) return { pulled: false };
      return start();
    },
  };
}
