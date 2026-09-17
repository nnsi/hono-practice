import type { SyncMutex } from "./createSyncMutex";

type NavigationSyncDeps = {
  syncAll: () => Promise<void>;
  pullSync: () => Promise<void>;
  isOnline: () => boolean;
  mutex: SyncMutex;
  onError?: (error: unknown, phase: "pull" | "push") => void;
};

export type NavigationSync = {
  /**
   * pull → push を fire-and-forget で実行する。5 秒以内の再発火は間引く。
   * 画面遷移・フォアグラウンド復帰・タブ表示など自動トリガー向け。
   */
  trigger: () => void;
  /**
   * pull → push を実行し完了まで待つ。間引きは行わず、mutex が使用中なら
   * 短時間空くのを待ってから pull する。pull-to-refresh など明示操作向け。
   */
  run: () => Promise<void>;
};

const THROTTLE_MS = 5000;
const MUTEX_WAIT_STEP_MS = 100;
const MUTEX_WAIT_MAX_MS = 10000;

// Why: 自動トリガーは ADR 20260321 のとおり mutex 使用中は pull をスキップする。
// 明示的な更新操作までスキップすると「ローダーが回ったのに何も来ない」ため、
// run() だけは上限付きで mutex の解放を待つ。
async function waitForMutex(mutex: SyncMutex): Promise<void> {
  let waited = 0;
  while (mutex.isBusy() && waited < MUTEX_WAIT_MAX_MS) {
    await new Promise((resolve) => setTimeout(resolve, MUTEX_WAIT_STEP_MS));
    waited += MUTEX_WAIT_STEP_MS;
  }
}

export function createNavigationSync(deps: NavigationSyncDeps): NavigationSync {
  let lastSyncAt = 0;

  const execute = async (waitMutex: boolean): Promise<void> => {
    try {
      if (waitMutex) await waitForMutex(deps.mutex);
      await deps.mutex.run(() => deps.pullSync());
    } catch (err) {
      deps.onError?.(err, "pull");
    }
    try {
      await deps.syncAll();
    } catch (err) {
      deps.onError?.(err, "push");
    }
  };

  return {
    trigger(): void {
      const now = Date.now();
      if (now - lastSyncAt < THROTTLE_MS) return;
      if (!deps.isOnline()) return;
      lastSyncAt = now;
      void execute(false);
    },
    async run(): Promise<void> {
      if (!deps.isOnline()) return;
      lastSyncAt = Date.now();
      await execute(true);
    },
  };
}
