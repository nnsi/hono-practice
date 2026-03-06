# リリース前 品質改善タスク

> 2026-03-04 コードレビューに基づくタスクリスト
> 関連: `docs/todo/mobile-release.md`（ストア申請・EAS設定のチェックリスト）

---

## Web + Mobile 共通タスク

### Critical

- [x] **プライバシーポリシー・利用規約の作成**
  - iOS/Android両ストアで申請必須、Google OAuth使用のため法的にも必要
  - Web版にもページを用意し、Mobile版からも同じ内容を画面内で表示する
  - 設定画面やログイン画面からリンク

### Warning

- [x] **エラーメッセージの詳細化**
  - Web: `apps/frontend-v2/src/` / Mobile: `apps/mobile-v2/src/utils/apiClient.ts`
  - 両方とも API通信エラーが汎用メッセージ（"Login failed" 等）
  - ネットワーク障害 vs 認証エラー vs サーバーエラーを区別してユーザーに伝える

- [x] **フォームバリデーション強化（目標の日付検証）**
  - Web: `CreateGoalDialog` / `EditGoalForm`
  - Mobile: `CreateGoalDialog` / 目標編集
  - 両方とも「終了日 < 開始日」の検証がない（CSVエクスポートにはある）

### Info

- [ ] Google OAuth が implicit flow（PKCE推奨だが現時点で動作する）

---

## Mobile 単体タスク

### Critical

- [ ] **fetch timeout の設定** (`apps/mobile-v2/src/utils/apiClient.ts`)
  - 現在タイムアウト未設定 → 不安定なモバイル回線で無限待機の可能性
  - `AbortController` + setTimeout で 10-15秒のタイムアウトを追加

- [ ] **本番API URLフォールバックの安全策** (`apps/mobile-v2/src/utils/apiClient.ts`)
  - `EXPO_PUBLIC_API_URL` 未設定時に `http://localhost:3456` に接続する
  - 実機ビルドでは確実に失敗するため、環境変数必須チェックまたは安全なデフォルトに変更

### Warning

- [ ] **KeyboardAvoidingView の実装** (モバイル固有)
  - `ModalOverlay` 内の `ScrollView` にキーボード対応が未設定
  - 高リスク: タスク作成/編集（multilineメモ欄がモーダル下部）
  - 中リスク: ログ記録/編集、アクティビティ作成/編集
  - 対応案:
    1. `ModalOverlay` の ScrollView に `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="interactive"` 追加
    2. `KeyboardAvoidingView` で ModalOverlay をラップ
    3. タスク/ログのメモ欄の高さを動的調整

- [ ] **console.error を reportError() に置き換え** (`apps/mobile-v2/src/hooks/useAuth.ts:72,130`)
  - 本番環境では `errorReporter` に送信すべき

### Info

- [ ] アクセシビリティ（testID / accessibilityLabel）がほぼゼロ
- [ ] UIコンポーネントのテストなし（現在はsync/repository/dbEventsのみ）
- [ ] ディープリンク未実装（scheme定義のみ、routing hooks なし）
- [ ] icon URL caching 戦略の改善（Cache-Control / ETag）
- [ ] CSV I/O のバージョン管理・重複チェック仕様の定義
