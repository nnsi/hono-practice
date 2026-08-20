import type {
  LocalTabPreference,
  TabKey,
} from "@packages/domain/user/tabPreferenceSchema";

import type { ReactHooks } from "./types";

/**
 * 非同期/同期どちらのストレージも包含できる最小ストレージ型。
 * Web の localStorage（同期）は `Promise.resolve(...)` で包んで渡せる。
 * Mobile の AsyncStorage（非同期）はそのまま渡せる。
 */
export type TabPreferenceStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
};

/**
 * tab-preference を server へ flush する transport。
 * 戻り値は API レスポンスの ok / status / json を満たす最小型。
 */
export type TabPreferenceFlushTransport = {
  putTabPreference(input: { tabs: TabKey[]; updatedAt: string }): Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
  }>;
};

export type CreateTabPreferenceStoreDeps = {
  react: Pick<ReactHooks, "useEffect">;
  useSyncExternalStore: <T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ) => T;
  storage: TabPreferenceStorage;
  transport: TabPreferenceFlushTransport;
  /** SETTINGS_KEY（localStorage / AsyncStorage 共通キー）。値は変えないこと。 */
  settingsKey: string;
  /**
   * 初期読み込み戦略。
   * - "sync": 構築時に同期で読み込む（Web。初回レンダリングで default が一瞬出ない）
   * - "lazy": 初回アクセス時に非同期で読み込む（Mobile）
   */
  initialLoad: "sync" | "lazy";
  /**
   * "sync" のときに使う同期読み込み関数。SSR 等で読めない環境では default を返す。
   */
  readSyncInitial?: () => LocalTabPreference;
  /**
   * クロスタブ同期等の外部ストレージ変更購読（Web の "storage" event）。
   * 変更時に `reload()` を呼ぶと storage を読み直して emit する。
   */
  subscribeExternalChange?: (reload: () => void) => () => void;
  /**
   * オンライン復帰時の flush 再試行を登録する（Web: window "online" / Mobile: NetInfo）。
   * useTabPreferenceSync の useEffect 内で呼ばれる。
   */
  registerOnlineRetry: (onOnline: () => void) => () => void;
};
