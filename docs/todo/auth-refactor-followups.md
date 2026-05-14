# auth-client リファクタの残置事項 (Follow-up)

> 対象: `packages/auth-client/` 抽出 PR (2026-05-14, commit `689b5944`)
> 経緯: multi-review 3 round で「別 PR で対応」と reviewer 合意した設計負債のリスト。
>       日記 `docs/diary/20260514.md` の午後セクションも参照。

各項目は独立して着手可能。優先度順に並べてある。

---

## 1. [ ] `setQueryClientReset` の mutable module-level ref を独立モジュール化

**現状**: `apps/frontend/src/auth/authController.ts` でモジュール変数 `queryClientResetRef: (() => void) | null` を `useAuth` の effect で都度 set/unset している。

**問題**: 複数の `useAuth` インスタンスが mount された場合 (理論上) や、unmount 順序により `setQueryClientReset(() => {})` で別マウントを上書きするリスク。現状 `__root.tsx` 1 箇所のみで顕在化していないが、hidden coupling になっている。

**対応案**: `apps/frontend/src/queryClient.ts` を作って QueryClient をモジュールシングルトン化。authController から直接 import して `queryClient.clear()` を呼ぶ形に。

**影響範囲**: `apps/frontend/src/main.tsx` の `QueryClientProvider` を新モジュール経由に / `useAuth` effect 削除 / authController.ts の `onAuthStateReset` から直接 `queryClient.clear()` 呼び出し。

**優先度**: 中 (顕在化していないので緊急ではないが、将来のリファクタで踏みやすい)

---

## 2. [ ] AccountSection / AccountAndDangerSection の delete account flow を authController 経由に

**現状**:
- `apps/frontend/src/components/setting/AccountSection.tsx:20-30`
- `apps/mobile/src/components/setting/AccountAndDangerSection.tsx`

両方で `apiClient.user.me.$delete()` → `db.delete()` / `clearLocalData()` → `clearToken()` を**直接呼んで** `window.location.href = "/"` でリロードしている。authController の `generation++` / `clearOnlineRetry` / `onAuthStateReset` を経由しない。

**問題**:
- 退会時に online retry リスナーが leak する可能性
- generation 不整合で進行中の reconcile が走り続けるリスク
- page reload で結果的に状態は再初期化されるため**実害は限定的**だが、新設計の「セッションライフサイクルは authController を通る」原則が崩れている

**対応案**: delete account 成功後に `authController.logout()` (or 専用 `authController.terminate()`) を呼ぶ。reload 前に clean shutdown が走る形に。

**影響範囲**: 上記 2 ファイル + テスト。

**優先度**: 低 (page reload で leak が回収されるため。設計整合性のみが目的)

---

## 3. [ ] `authController` → `initialSync` → `apiClient` の循環依存解消

**現状**:
```
apps/frontend/src/auth/authController.ts
  → import { performInitialSync } from "../sync/initialSync"
  → import { apiClient } from "../utils/apiClient"
  → re-export from "../auth/authController"  (= 循環)
```

**問題**: ESM の遅延 binding で現状は動作している (`apiClient.ts` は authController.ts の re-export shim) が、初回読み込み順序によっては TDZ になりうる脆弱な構造。

**対応案**: `apps/frontend/src/utils/apiClient.ts` を廃止し、各 import 側 (sync, settings, contact 等) を `auth/authController` から直接 import する形に統一。`apiClient.ts` の re-export shim が消える。

**影響範囲**: 大 (`apiClient` を import している 20+ ファイル の import 経路書き換え。機械的だが diff が膨らむ)

**優先度**: 中〜低 (顕在化していない、ただし将来 `customFetch` の独立モジュール化と合わせてやるとスッキリする)

---

## 4. [ ] `webAuthTransport` / `mobileAuthTransport` の単体テスト

**現状**: `packages/auth-client/createAuthController.test.ts` で in-memory transport stub を使ってテスト済み。**実 transport の `refreshSession` kind 返却ロジックは未テスト**。

**対象**:
- `apps/frontend/src/auth/webAuthTransport.ts` の `refreshSession`:
  - 200 → `{ kind: "ok" }`
  - 401/403 → `{ kind: "expired" }`
  - 500 → `{ kind: "transient" }`
- `apps/mobile/src/auth/mobileAuthTransport.ts` の `refreshSession`:
  - no refresh token → `{ kind: "expired" }`
  - 200 → `{ kind: "ok" }` + SecureStore に refreshToken 書き込み
  - 401/403 → `clearStoredRefreshToken` + `{ kind: "expired" }`
  - 500 → `{ kind: "transient" }`
  - network error → `{ kind: "transient" }`

**対応案**: `fetch` を mock して `apps/{frontend,mobile}/src/auth/*Transport.test.ts` を新設。`createAuthenticatedFetch.test.ts` のパターン (`vi.stubGlobal("fetch", mockFetch)`) を踏襲。

**影響範囲**: 新規テストファイル 2 つ。

**優先度**: 中 (`refreshSession` の kind 判定はセキュリティクリティカルな分岐。回帰防止に価値あり)

---

## 5. [ ] `mobileAuthStateRepository.updateColumn` の並列呼び出しテスト

**現状**: `apps/mobile/src/auth/mobileAuthStateRepository.ts` で `ensureRow` (INSERT OR IGNORE) → `UPDATE col = ? WHERE id = 'current'` の 2 step。SQLite は serialized なので race は理論上ない、と Round 2 では結論付けたが**テストでカバーしていない**。

**対応案**: `apps/mobile/src/auth/mobileAuthStateRepository.test.ts` を新設し、`setUserId`/`setPlan`/`setLastLoginAt` を並列で呼んでも最終的に全カラムが正しく書かれていることを確認。expo-sqlite のモックパターンは既存テストファイルを参照。

**優先度**: 低 (race が起きないと結論付け済み、回帰防止のみ)

---

## 6. [ ] CORS 改善 (X-Refresh-Token の取り扱い)

**現状**: Round 2 で `apps/backend/app.ts` の `cors()` に `allowHeaders: ["Authorization", "Content-Type", "X-Refresh-Token"]` を明示した。

**追加で検討すべき**:
- `X-Refresh-Token` は mobile (Origin なし) 専用想定だが、現状 Web からも送信可能になっている
- backend の `/logout` で `isMobileClient(c)` チェック後にのみ `X-Refresh-Token` ヘッダを受け付ける形にすればさらに堅牢

**優先度**: 低 (`/logout` には `authMiddleware` があるため実害は限定的)

---

## 7. [ ] Web logout のネットワーク失敗時 UX

**現状**: `transport.logout()` が失敗した場合 (network error / 5xx)、サーバー側 `clearRefreshCookie` が走らず httpOnly cookie が残る。次回ページロード時に `reconcile` が cookie で成功し**自動再ログイン**してしまう。共有デバイスでのセキュリティ問題。

**対応案**: logout 失敗を検知して UI で警告 ("ログアウトに失敗しました。ネットワークを確認して再試行してください")。あるいは local state は clear したまま、bg で retry する仕組み。

**優先度**: 中 (Round 1 で security reviewer が指摘、共用デバイスシナリオでは実害)

---

## 8. [ ] `setAccessToken` vs `persistSession` の責務オーバーラップ整理

**現状**:
- `AuthTransport.setAccessToken(token)`: メモリの access token のみ更新
- `AuthTransport.persistSession(session)`: token + refresh token 永続化 (Mobile: SecureStore)

両方が `tokenHolder.setToken(session.token)` を含むため冗長。

**対応案**: `persistSession` を「永続層 (cookie / SecureStore) への書き込みのみ」に限定し、access token のメモリ反映は `setAccessToken` の専任にする。

**優先度**: 低 (動作は冪等で問題なし、設計整合性のみ)

---

## 関連リファレンス

- 実装: `packages/auth-client/`, `apps/{frontend,mobile}/src/auth/`
- ADR: `docs/adr/20260215_auth_flow.md`, `docs/adr/20260514_refresh_token_state_machine.md`, `docs/adr/20260322_ghost_login_on_init_refresh_failure.md`
- 日記: `docs/diary/20260514.md` (午後セクション)
- PR commit: `689b5944 refactor(auth): packages/auth-client 抽出で Web/Mobile 重複を解消`
