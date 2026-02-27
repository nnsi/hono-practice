/**
 * syncEngine.startAutoSync() の戻り値と同じシグネチャ
 */
type SyncEngine = {
  startAutoSync: () => () => void;
};

type ReactHooks = {
  useEffect: (effect: () => (() => void) | void, deps: unknown[]) => void;
  useRef: <T>(initial: T) => { current: T };
};

/**
 * SyncEngine のライフサイクルを管理する共通フックファクトリ。
 * useRef でクリーンアップ関数を保持し、re-render 時のリスナーリークを防止する。
 *
 * React hooks を DI で受け取る（Metro + pnpm 環境で packages/ から react を
 * 直接 import すると CJS 初期化問題が起きるため）。
 */
export function createUseSyncEngine(react: ReactHooks) {
  return function useSyncEngine(
    syncEngine: SyncEngine,
    isLoggedIn: boolean,
  ): void {
    const cleanupRef = react.useRef<(() => void) | null>(null);

    react.useEffect(() => {
      if (isLoggedIn) {
        cleanupRef.current = syncEngine.startAutoSync();
      }
      return () => {
        cleanupRef.current?.();
        cleanupRef.current = null;
      };
    }, [isLoggedIn, syncEngine]);
  };
}
