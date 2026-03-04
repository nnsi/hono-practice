# mobile-v2 リリース前 品質改善タスク

> 2026-03-04 コードレビューに基づくタスクリスト
> 対象: `apps/mobile-v2`
> 関連: `docs/todo/mobile-release.md`（ストア申請・EAS設定のチェックリスト）

---

## Critical（リリースブロッカー）

- [ ] **プライバシーポリシーURL作成・設定**
  - iOS/Android両ストアで申請必須
  - Google OAuth使用のため法的にも必要
  - ホストURL決定 → app.json に設定

- [ ] **fetch timeout の設定** (`src/utils/apiClient.ts`)
  - 現在タイムアウト未設定 → 不安定な回線で無限待機の可能性
  - `AbortController` + setTimeout で 10-15秒のタイムアウトを追加

- [ ] **本番API URLフォールバックの安全策** (`src/utils/apiClient.ts`)
  - `EXPO_PUBLIC_API_URL` 未設定時に `http://localhost:3456` に接続する
  - 実機ビルドでは確実に失敗するため、環境変数必須チェックまたは安全なデフォルトに変更

---

## Warning（リリース前に対応推奨）

### UX改善

- [ ] **同期状態のフィードバックUI追加**
  - 「最終同期: X分前」またはスピナー表示
  - sync失敗時のユーザー通知

- [ ] **オフラインモード表示**
  - ネットワーク切断時のバナーやインジケータ
  - NetInfo の `addEventListener` で接続状態監視

- [ ] **KeyboardAvoidingView の実装**
  - フォーム画面（ログイン、目標作成、タスク作成等）
  - 大画面でTextInputがキーボードに隠れる問題

- [ ] **Goal削除に確認ダイアログ追加**
  - TaskにはDeleteConfirmDialogがあるがGoalにはない
  - 一貫性のため統一

- [ ] **エラーメッセージの詳細化** (`src/utils/apiClient.ts`)
  - "Login failed" 等の汎用メッセージ → ネットワーク障害と認証エラーを区別
  - サーバーレスポンスの詳細（ステータスコード等）をユーザーに伝える

### コード品質

- [ ] **console.error を reportError() に置き換え** (`src/hooks/useAuth.ts:72,130`)
  - 本番環境では `errorReporter` に送信すべき

- [ ] **supportsTablet 設定の見直し** (`app.json`)
  - `supportsTablet: true` だがレスポンシブ対応なし
  - iPad で画面余白が大きくなる
  - 選択肢: (A) レスポンシブ対応する (B) `supportsTablet: false` にする

- [ ] **フォームバリデーション強化**
  - 目標作成: 終了日 < 開始日の検証なし
  - 数量入力: 負数の検証なし

---

## Info（リリース後でも対応可）

- [ ] アクセシビリティ（testID / accessibilityLabel）がほぼゼロ
- [ ] UIコンポーネントのテストなし（現在はsync/repository/dbEventsのみ）
- [ ] Google OAuth が implicit flow（PKCE推奨だが現時点で動作する）
- [ ] ディープリンク未実装（scheme定義のみ、routing hooks なし）
- [ ] icon URL caching 戦略の改善（Cache-Control / ETag）
- [ ] CSV I/O のバージョン管理・重複チェック仕様の定義
