# Actiko v2 開発者向けリリースノート

v2リリース日: 2026-02-25

`docs/diary/` をもとに、日記の日付を更新日として扱い、内部リファクタリング、開発基盤、運用改善、管理画面、品質改善を整理しています。ユーザー向けの変更は `docs/release-note.md` に分離しています。

## ハイライト

- `packages/domain` / `packages/frontend-shared` / `packages/sync-engine` を軸に、Web / Mobile / Backend の共通化を継続的に推進
- 同期基盤を重点的に強化し、pending保護、世代管理、`syncReady` ゲート、failedリトライ、段階的例外処理、順序制御を追加
- `feature-v2` から `feature-sync` への整理、route / handler / usecase / repository 分離、型定義整理、tsconfig / path alias 棚卸しを実施
- PGlite + Hono + Vite + Playwright によるE2E基盤、feature-sync usecase / routeテスト、mobile純粋ロジックテストを追加
- pnpm / Metro / Vite / Expo / EAS 周りの依存解決とビルド基盤を継続的に改善し、Expo Web と OTA の運用基盤を整備
- WAE APM、client error収集、tracer span、エラーレポート共通化、client error dataset 分離など可観測性を強化
- `apps/admin-frontend` を新設し、ダッシュボード、問い合わせ管理、サブスクリプション管理、CI/CD を整備
- `feature-dev`、`review-cycle`、`browser-check`、PreCompact hook、`diary-unsaid-check` など、エージェント運用そのものを改善

## 更新履歴

### 2026-02-25

- 旧 `apps/frontend` を削除し、`frontend-v2` 前提の構成に整理
- `packages/frontend-shared` の不要コードと依存を大幅削減
- Daily のタスク表示ロジックをAPI実装と突き合わせて整合
- `packages/domain` 抽出計画をレビューサイクルで磨き込み、実装準備を完了

### 2026-02-26

- React Native版の方針を WatermelonDB から `expo-sqlite` ベースへ再設計
- `Syncable<T>`、Repository抽象、platform adapter など RN 移行用の共通基盤を整備
- Recharts から Victory へ移行し、Web / RN 共通チャート方針に統一
- Expo SDK 53 と React 19 に合わせて Expo Web の競合を整理し、RN Web 動作確認基盤を整備

### 2026-02-27

- frontend と mobile の画面・ロジック差分を広範囲に洗い出し、並列エージェントで一括修正
- Expo SDK 54 に合わせた調整と Worklets バージョン整合を実施
- `hono/client` を使った mobile RPC 化を進め、手書きAPI wrapperを整理
- drizzle-orm の重複解決と依存配置の整理で大量型エラーを解消

### 2026-02-28

- `createUseSyncEngine` 方式で共有 hook を Metro 互換に再設計
- mobile の dialog hook 分離で Web / Mobile の構造差を縮小
- sync のチャンク分割とバックエンドの batch upsert 化を実施
- feature-sync ルートを route / handler / usecase / repository の4層構造へ分離
- `shamefully-hoist` 撤去、root 依存整理、Hono / Drizzle 周りの依存衛生を改善
- WAE APM 用 tracer span を v2 API に追加

### 2026-03-01

- feature-sync の route test をコロケーション化し、usecase test を新規作成
- 5分境界値、deletedAt、100件境界などの不足ケースを review-cycle 経由で補完
- `initialSync` の DB 空 + `LAST_SYNCED_KEY` 残存バグを修正
- `logout()` と `auth_state` の役割分離を整理し、別アカウント切替時のデータ汚染を解消
- `clearLocalData()` の設計曖昧さを掘り起こして修正し、回答方針も CLAUDE.md に追記

### 2026-03-02

- 再設計議論の結果を `docs/rearchitect-plan.md` に整理
- R2 画像が `secureHeaders()` の CORP でブロックされる問題を修正
- `shamefully-hoist` 撤去後の root 依存整理と noArrayIndexKey 修正を実施
- Activity icon blob を sync 後も保持する設計へ変更し、オフライン表示の穴を解消

### 2026-03-03

- CI だけで落ちる `drizzle-orm` 解決問題を、root 依存追加で根本解決
- `rearchitect-plan.md` の高〜中優先度を一括実装し、types / sync / 共通ロジック整理を前進
- PGlite + Hono + Vite + Playwright を使う Web E2E 基盤を新設
- GitHub Actions の SHA 固定、`env:` 経由化などで deploy workflow を harden

### 2026-03-04

- `docs/knowledges` をコードベース実態に合わせて全面更新
- `ENABLE_TOOL_SEARCH`、PreCompact hook、`cc-log-to-md.js`、`write-diary` 改修でコンテキスト運用を改善
- WAE の client error 収集ルートと mobile 側 global error handler を追加
- モバイルのリリース準備評価を行い、法律文書と TODO を整理

### 2026-03-06

- `lexicalOrder` を共有パッケージへ移し、orderIndex 生成をバックエンドと統一
- エラー報告基盤を共通化し、frontend 側にも ErrorBoundary を導入

### 2026-03-08

- sync 基盤の pending 保護、`syncReady` ゲート、userId 未設定書き込み防止を追加
- sync 世代管理で `clearLocalData()` 後の古いインフライト書き戻しを防止
- push 失敗の成功扱いを廃止し、失敗時は必ず例外化する挙動へ統一
- `codex` スキルを全面リライトし、WAE APM スキルも拡張

### 2026-03-11

- recording mode の型、共有 hook、registry、UI parts を packages / apps に跨って導入
- `LogFormBody.tsx` を大幅分割し、記録UIのアーキテクチャを整理
- `recordingModeConfig` 永続化のため Postgres / Dexie / SQLite / DTO / API 層を横断更新

### 2026-03-12

- Binary / Numpad / Check mode を kinds ベース実装に寄せ、テスト構造も刷新
- `renderHook` + `jsdom` ベースに recording mode テスト基盤を再構築
- `packages/domain/goal/goalHeatmap.ts` と `useGoalHeatmap` を追加し、ヒートマップ算出を共通化

### 2026-03-13

- mobile Web リロード後にデータが空になる問題を `initialSync` / local DB の両面から修正
- Debt feedback を配列イベント化し、複数ゴール対応の内部イベントシステムへ拡張
- Tier 1 実装に対してサブエージェント + Codex の並列レビューを回し、設計の粗さを補修

### 2026-03-14

- `dayTargets` 向けに `parseDayTargets()`、厳密 Zod schema、共通 builder 集約を追加
- 日記から CLAUDE.md / Skill ルールを抽出し、レビュー運用・完了定義・テスト観点を明文化
- E2E テストの網羅を強化し、v1 Goal API 拡張も実施
- Task ↔ Activity リンク基盤と Web / Mobile リポジトリ共通化を進めた

### 2026-03-15

- ADR を3月分まとめて整備し、設計判断の履歴を整理
- アーキテクチャ評価を起点に4項目のリファクタを実施
- `-v2` 命名を一掃し、`apps/frontend-v2` → `apps/frontend`、`apps/mobile-v2` → `apps/mobile`、`feature-v2` → `feature-sync` に整理
- Web / Mobile 機能差の残件と quality ドキュメント上の TODO を消化

### 2026-03-16

- モバイルのリリース blocker / high 項目を集中的に修正し、ErrorBoundary 復旧導線も追加
- freeze period の初期同期バグを補修
- frontend の型チェックを root `tsconfig.json` 配下へ戻し、path alias も棚卸し
- AI 連携機能の基盤、Gateway、レビューサイクルを整備

### 2026-03-17

- Vitest の並列設定、TRUNCATE 運用などを見直し、テスト時間を短縮
- EAS / OTA の設定、`mobile-ota.md`、モバイル用 CLAUDE.md を整備
- `[updates]` 系のデバッグ情報を WAE に送る経路を追加し、OTA 調査性を改善

### 2026-03-19

- `post-lint.js`、`lefthook`、noExplicitAny 全排除、archgate で静的品質ゲートを強化
- iOS preview ビルド、OTA 手順、実機テストチェックリストを整備
- WAE APM ログと日記の突き合わせ運用を進め、400系記録改善と Dexie migration v7 を追加
- CLAUDE.md をスリム化し、`.claude/rules/parallel-agents.md` へ教訓を移設
- OTA update スキルを追加

### 2026-03-20

- Google OAuth の Android フローを分解して診断し、バックエンド relay / redirect 問題を整理
- Apple Sign-In 対応に合わせて `authRoute` を分割リファクタリング

### 2026-03-21

- `app.json` から `app.config.ts` へ移行し、環境変数を注入しやすい構成へ変更
- Apple `/link` エンドポイントを追加し、Google と対称な provider 連携構成に整理
- WAE APM の client error 分析を行い、関連する小修正を継続実施

### 2026-03-22

- `setOnAuthExpired` コールバックを sync-engine まで配線し、認証失効時の扱いを整理
- `useAuthInit.ts` を切り出して `useAuth` の初期化ロジックを分離
- `syncAll` を per-step try/catch 化し、backoff 条件と依存順序を見直し
- failed リトライ、Tasks 先行 sync、mobile 欠落 trigger を追加
- `debtFeedbackEvents`、`taskGrouping`、`useTimer`、`useNavigationSync` を共有パッケージへ移設

### 2026-03-23

- `IMESafeTextInput` を導入し、IME / defaultValue / 高さ揺れに対応する共通入力コンポーネントを整備
- Calendar / modal / ActivitySelect 周りの部品分割を進め、CreateLogDialog の構造を整理

### 2026-03-24

- Android / iOS ウィジェット基盤、Config / App Intent / Deep Link まわりを実装
- `eas build` 周辺の運用をスキル化し、検証フローを標準化
- マネタイズ / リリース戦略の壁打ち結果を成果物へ反映

### 2026-03-25

- entitlement 純粋関数群、`plan` キャッシュ、`usePlan` hook など課金コアを追加
- RevenueCat / Polar webhook 基盤と `upsertSubscriptionFromPayment` usecase を整備
- 音声ショートカット向け API key scope 設計と実装方針を整理
- DDL ブロック用 PreToolUse hook を導入

### 2026-03-26

- Widget の parameter / kind / free-plan 制限を各OSの制約に合わせて改善
- foreground 復帰時の `/user/me` 同期と plan 反映を導入
- Siri 用 voice API key の自動プロビジョニングを追加
- 法務 review-cycle を回し、特商法 / 規約 / プライバシー文書の内部品質を上げた
- `diary-unsaid-check` hook を作成し、日記から未共有懸念を拾う流れを追加

### 2026-03-27

- 複数手法のセキュリティ監査結果を統合し、sync API の所有権検証、since バリデーション、整合性検証を強化
- refresh token replay window を検討し、現設計の安全性を整理
- QA モンキーテストで追加バグを洗い出して修正
- React / ReactDOM の dedupe を `vite.config.ts` に導入

### 2026-03-28

- Harness Engineering の自己レビューを行い、エージェント運用上の弱点を整理
- quality scan を実施し、不要になった `docs/knowledges` を削除
- `as unknown as` 撤廃パターンを複数箇所に適用
- `auth_flow.md` を ADR として再配置

### 2026-03-29

- `scripts/worktree-setup.sh` / `scripts/worktree-cleanup.sh` と関連スキルを追加し、worktree 並行開発基盤を整備
- ポートのハードコードを `CLAUDE.md` やスキルから除去し、`.env` / `vite.config.ts` 参照方式へ統一
- `ChartData` を `{ date, values }` 構造へ変更し、index signature 由来の `as` キャストを一掃
- 問い合わせフォームを最初の worktree 実戦題材として実装し、`.env.local` / `.env` 差異も整理
- WAE APM ログ分析を実施し、bot scan 除外、sync 4xx リトライ停止、SQLite `busy_timeout` 追加など4件を修正
- `apps/admin-frontend` を新設し、管理者認証、ダッシュボード、問い合わせ管理、DI / APM provider 抽象を整備
- admin-frontend の CI/CD と WAE ログアーカイブ方針を追加
- API key scope を配列化し、resource × action ベースへ拡張

### 2026-03-30

- Apple HIG / Material 3 / WCAG 2.2 観点で mobile UI 監査を実施し、`docs/todo/app-ui-guideline.md` に整理
- timezone 対応リファクタを 93 ファイル規模で実施し、JST 固定実装を段階的に撤去
- `feature-dev` スキルを新規作成し、公式プラグイン比較と実運用ログから改善を反映
- UI ガイドライン監査を受けた実装修正を 90+ ファイル規模で実施

### 2026-04-01

- `IMESafeTextInput` を再設計し、DailyPage 分割や theme 周りも整理
- モバイル実機フィードバックに応じて、入力・色・グリッド・モーダル挙動を複数回に分けて改善
- Android キーボード回避を `KeyboardAvoidingView` と dialog 構造から見直し
- iOS IME 下線問題を React Native 本体の Fabric TextInput バグまで切り分け
- nativewind / `react-native-css-interop` に patch を当て、OTA restart 時のダークモードフラッシュを解消

### 2026-04-02

- 削除済み Activity 表示変更に対するレビュー結果を踏まえ、回帰導線を確認
- admin-frontend にサブスクリプション管理、ユーザー詳細、手動付与・編集機能を追加
- worktree 環境で admin-frontend の `.env` 生成漏れがあることを確認し、後続改善点として整理

### 2026-04-03

- 5セッション分の `/feature-dev` 実行ログを読み、ワークフローを継続改善
- TaskCreate チェックリスト、委譲原則、Codex 無結果時のリトライ、browser-check 明文化などを追加
- `worktree-setup.sh` に admin-frontend 対応を反映
- 強い文言より構造的強制を優先する方針へ寄せ、運用ルールを更新
