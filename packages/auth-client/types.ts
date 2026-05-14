import type { Consents } from "@packages/types/request";
import type { AuthResponse, GetUserResponse } from "@packages/types/response";

export type AuthSession = AuthResponse;

// refresh の結果。expired は「セッション復元不能 = ログアウト確定」、transient は
// 「ネットワーク等の一時障害 = リトライ可能」を表す。controller 側で分岐するため
// transport は副作用 (onAuthExpired callback 等) を持たない。
export type RefreshResult =
  | { kind: "ok"; session: AuthSession }
  | { kind: "expired" }
  | { kind: "transient"; reason?: string };

export type AuthTransport = {
  login(loginId: string, password: string): Promise<AuthSession>;
  register(
    loginId: string,
    password: string,
    consents: Consents,
  ): Promise<AuthSession>;
  googleLogin(credential: string, consents?: Consents): Promise<AuthSession>;
  appleLogin(credential: string, consents?: Consents): Promise<AuthSession>;
  refreshSession(): Promise<RefreshResult>;
  logout(): Promise<void>;
  setAccessToken(token: string | null): void;
  // 外部経路で取得した session を transport の永続化レイヤー (Web: cookie は backend
  // が Set-Cookie 済みなので no-op / Mobile: SecureStore に refresh token を書く) に
  // 反映する。controller.applyExternalSession から呼ばれる。
  persistSession(session: AuthSession): Promise<void>;
};

// AuthController が永続化に書き込むチュートリアル状態 (null は未設定)
export type AuthTutorialStatus = "pending" | "done" | null;

export type AuthStateRepository = {
  getCurrentUserId(): Promise<string | null>;
  getLastLoginAt(): Promise<string | null>;
  setLastLoginAt(value: string): Promise<void>;
  setUserId(userId: string): Promise<void>;
  setPlan(plan: string): Promise<void>;
  setTutorialStatus(status: AuthTutorialStatus): Promise<void>;
  clearLastLoginAt(): Promise<void>;
};

export type OnlineRetryAdapter = {
  // online イベント等の "ネットワーク復帰" を待つ。コールバック呼び出し後の cleanup を返す
  registerOnlineRetry(handler: () => void): () => void;
};

export type AuthControllerState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
};

export type AuthControllerOptions = {
  transport: AuthTransport;
  authStateRepo: AuthStateRepository;
  online?: OnlineRetryAdapter;
  // ユーザー切替検知時に呼ばれる (ローカルデータ全削除等)
  onUserSwitch?: () => Promise<void>;
  // 初回同期
  performInitialSync: (userId: string) => Promise<void>;
  // tabPreference / その他 user 情報のローカル反映
  onUserSynced?: (user: GetUserResponse) => void | Promise<void>;
  // logout / 期限切れ時のローカルクリア (queryClient.clear 等)
  onAuthStateReset?: () => void | Promise<void>;
};

export type AuthController = {
  getState(): AuthControllerState;
  subscribe(listener: () => void): () => void;
  // local の last_login_at で UI を即出す
  hydrate(): Promise<void>;
  // サーバー refresh → user 反映 → initialSync
  reconcile(): Promise<boolean>;
  login(loginId: string, password: string): Promise<void>;
  register(
    loginId: string,
    password: string,
    consents: Consents,
  ): Promise<void>;
  googleLogin(credential: string, consents?: Consents): Promise<void>;
  appleLogin(credential: string, consents?: Consents): Promise<void>;
  // 外部で取得した session を controller に流し込む (OAuth code exchange 等の
  // 通常 transport を経由しないログイン経路用)
  applyExternalSession(session: AuthSession): Promise<void>;
  logout(): Promise<void>;
};
