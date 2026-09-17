import type { SyncMutex } from "./createSyncMutex";

type NavigationSyncDeps = {
  syncAll: () => Promise<void>;
  pullSync: () => Promise<void>;
  isOnline: () => boolean;
  mutex: SyncMutex;
  onError?: (error: unknown, phase: "pull" | "push") => void;
};

export type NavigationSyncResult = {
  /**
   * mutex を取得して pullSync を呼べたか。待機上限まで空かなかった・
   * pullSync が例外を投げた・cancel されたときは false。
   */
  pulled: boolean;
};

export type NavigationSync = {
  /**
   * pull → push を fire-and-forget で実行する。直近の同期完了（成否問わず）
   * から 5 秒以内は間引く。画面遷移・フォアグラウンド復帰・タブ表示・
   * オンライン復帰など自動トリガー向け。
   */
  trigger: () => void;
  /**
   * pull → push を実行し完了まで待つ。間引きは行わない。
   * pull-to-refresh など明示操作向け。
   */
  run: () => Promise<NavigationSyncResult>;
  /**
   * 以後の pull / push を打ち切る。mutex 待機中の要求も開始せずに終わる。
   * ログアウトやアカウント切替で userId が変わったときに呼ぶ。
   */
  cancel: () => void;
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
  // Why: 成功時だけでなく失敗・待機上限到達の後も 5 秒の下限を置く。
  // pull が失敗し続ける状態でタブ切替のたびに全 API の pull と
  // reportError が走るのを防ぐ。cancel は間引かない。
  let lastAttemptAt = 0;
  let inFlight: Promise<NavigationSyncResult> | null = null;
  let cancelled = false;

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  // mutex.run は busy なら fn を実行せず undefined を返す。true が返るまで
  // 再試行することで、isBusy() の観測と取得の間に割り込まれても取りこぼさない。
  const pullWithWait = async (): Promise<boolean> => {
    const deadline = Date.now() + MUTEX_WAIT_MAX_MS;
    for (;;) {
      // Why: 待機中にログアウト・アカウント切替が起きると、古い userId の
      // pull が後から走って authState やローカル DB を汚す。取得直前に確認する。
      if (cancelled) return false;
      const acquired = await deps.mutex.run(async () => {
        if (cancelled) return false;
        await deps.pullSync();
        return true;
      });
      if (acquired) return true;
      if (cancelled || Date.now() >= deadline) return false;
      await sleep(MUTEX_WAIT_STEP_MS);
    }
  };

  const execute = async (): Promise<NavigationSyncResult> => {
    let pulled = false;
    try {
      pulled = await pullWithWait();
    } catch (err) {
      deps.onError?.(err, "pull");
    }
    if (cancelled) return { pulled };
    try {
      await deps.syncAll();
    } catch (err) {
      deps.onError?.(err, "push");
    }
    lastAttemptAt = Date.now();
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
      if (cancelled || inFlight) return;
      if (Date.now() - lastAttemptAt < THROTTLE_MS) return;
      if (!deps.isOnline()) return;
      void start();
    },
    async run(): Promise<NavigationSyncResult> {
      if (cancelled || !deps.isOnline()) return { pulled: false };
      return start();
    },
    cancel(): void {
      cancelled = true;
    },
  };
}
