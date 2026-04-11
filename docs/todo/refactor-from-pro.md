# 改善チェックリスト

> 前提: 添付リポジトリの静的レビューで検出できた改善点を列挙。依存取得・実行確認・外部サービス疎通は未実施。

## P0: 先に潰すべき不整合・事故要因

- [x] `packages/frontend-shared/hooks/useLogForm.ts` の送信中フラグを `try/finally` で必ず解除する
  - 対象: `handleManualSubmit`, `handleTimerSave`
  - 現状: 保存失敗時に `isSubmitting` が戻らず、UI が詰まる
  - 連動修正: `apps/frontend/src/components/common/useLogForm.test.ts` の期待値を修正する
    - 現在は「失敗時に `onDone` が呼ばれない / submit 状態が戻らない」前提のテストがある

- [x] タスク完了と `ActivityLog` 自動生成を原子的に扱う
  - 対象:
    - `packages/frontend-shared/hooks/useTasksPage.ts`
    - `packages/frontend-shared/hooks/useDailyPage.ts`
  - 現状: task 更新成功後に activity log 作成が失敗すると整合性が崩れる
  - 対応: transaction / compensation / server-side command のいずれかに統一
  - 追加テスト:
    - task 更新成功 + log 作成失敗
    - log 削除失敗
    - sync 失敗
    - 重複実行

- [x] `c.req.json<T>()` を全廃し、Zod バリデーションに統一する
  - ルール違反元: `apps/backend/CLAUDE.md`
  - 対象:
    - `apps/backend/app.ts`
    - `apps/backend/feature/activity/activityRoute.ts`
    - `apps/backend/feature/admin/adminAuthRoute.ts`
  - 対応:
    - request schema 定義
    - parse 失敗時の 400 応答
    - 型推論の接続
    - CI で再発防止

- [x] R2 と DB の整合性を保証する
  - 対象: `apps/backend/feature/activity/activityUsecase.ts`
  - 現状:
    - upload: R2 保存後に DB 更新失敗で orphan object が残る
    - delete: R2 削除失敗でも DB だけ emoji 状態に戻る
  - 対応:
    - outbox / retry queue / compensation / garbage collection のいずれかを導入
    - 失敗時の監視・再実行手段を用意

- [x] API key 検証処理の未完了 TODO を解消する
  - 対象: `apps/backend/feature/apiKey/apiKeyUsecase.ts`
  - 現状:
    - KV cache delete/read/write TODO が残存
    - `lastUsedAt` 更新失敗を fire-and-forget + `console.error` で処理
  - 対応:
    - DB only にするなら TODO を消し、方針を ADR/コードコメントに固定
    - KV を使うなら invalidate/read/write を実装
    - `lastUsedAt` 更新失敗を structured logger / monitoring に送る

- [x] 本番コードの `console.*` を整理し、ロガー/監視に統一する
  - まず修正:
    - `apps/backend/server.node.ts`
  - 直接 `console.*` を使っている本番コード:
    - `apps/backend/server.node.ts`
    - `apps/backend/feature/activity/activityUsecase.ts`
    - `apps/backend/feature/activity/activityRoute.ts`
    - `apps/backend/feature/activityLog/activityLogRoute.ts`
    - `apps/backend/feature/auth/refreshTokenRepository.ts`
    - `apps/backend/feature/admin/waeQuery.ts`
    - `apps/backend/feature/admin/waeClientErrorQuery.ts`
    - `apps/backend/feature/apiKey/apiKeyUsecase.ts`
    - `packages/sync-engine/orchestration/createNavigationSync.ts`
    - `packages/sync-engine/pull/createInitialSync.ts`
    - `apps/frontend/src/hooks/useNavigationSync.ts`
    - `apps/frontend/src/sync/syncActivities.ts`
    - `apps/frontend/src/components/actiko/useCreateActivityDialog.ts`
    - `apps/mobile/src/sync/syncEngine.ts`
    - `apps/mobile/src/sync/syncActivities.ts`
    - `apps/mobile/app/oauthredirect.tsx`
    - `apps/mobile/src/hooks/useOtaUpdate.ts`
    - `apps/mobile/src/db/database.ts`
    - `apps/mobile/src/lib/voiceApiKey.ts`
  - 注: `apps/backend/lib/logger.ts` の console sink 自体は別扱い
  - 対応:
    - backend は `apps/backend/lib/logger.ts` に寄せる
    - shared package は logger/reporter を注入式にする

- [x] `.env.local` 系を Git ignore 対象に追加する
  - 対象: `.gitignore`
  - 現状: `.env` は ignore されているが `.env.local` が対象外
  - 確認対象:
    - ルート `.env.local`
    - `apps/backend/.env.local`
  - 対応:
    - `.env.local`, `**/.env.local` を ignore
    - 共有/コミット済み履歴があるなら secrets をローテーション

- [x] PR CI で `apps/admin-frontend` の型チェックを実行する
  - 対象:
    - `.github/workflows/pr.yml`
    - `tsconfig.json`
  - 現状:
    - root `tsc --noEmit` は `apps/admin-frontend` を除外
    - PR workflow は admin build のみで admin typecheck がない

- [x] mobile CI の不在を解消する
  - 対象:
    - `.github/workflows/pr.yml`
    - `.github/workflows/deploy.yml`
    - `docs/adr/20260316_mobile_cicd_workflow_dispatch.md`
  - 現状:
    - PR に mobile build/test がない
    - ADR は workflow_dispatch + 2 workflow 想定
    - 実装は `deploy.yml` / `pr.yml` のみ
  - 対応:
    - PR build/typecheck/test
    - release workflow
    - ADR と実装の同期

- [x] 現行運用文書の陳腐化を解消する
  - active docs 対象:
    - `docs/adr/20260215_do_to_kv_ratelimit.md`
    - `docs/adr/20260225_domain_logic_to_packages.md`
    - `docs/adr/20260315_remove_v2_naming.md`
    - `docs/adr/20260315_sync_engine_consolidation.md`
    - `docs/release-note-dev.md`
    - `docs/ops/mobile-ota.md`
  - 代表的な壊れた参照:
    - `infra/do/kvs.ts`
    - `apps/backend/infra/kv/do.ts`
    - `packages/domain/task/taskEntity.ts`
    - `apps/frontend-v2/package.json`
    - `apps/frontend-v2/CLAUDE.md`
    - `apps/frontend/src/sync/index.ts`
    - `docs/knowledges`
    - `apps/mobile/.env`

## P1: 近いうちに返済したい設計・品質負債

> 評価軸: 実装コストを度外視した「理想として直す価値があるか」で 3 段階にグルーピング。
> 着手順の推奨は「明確にやる価値がある」の API 契約単一ソース化 (手書き API リファレンス廃止 → 逆依存解消 → scope 二重管理) から。

### 明確にやる価値がある

- [ ] 手書き API リファレンスをやめ、契約から生成する
  - 対象: `apps/frontend/src/components/api-reference/apiReferenceData.ts`
  - 現状: ルート/スキーマと二重管理でドリフトしやすい
  - 対応: contract/OpenAPI/schema から生成
  - 評価: API 契約の単一ソース化は最優先級。次項 (逆依存解消・scope 二重管理) とセットで解決する

- [ ] `packages/types/api.ts` の packages → apps 逆依存を解消する
  - 現状: `@backend/app` の `AppType` を再 export しており、レイヤー例外が残る
  - 対応: 生成済み API contract package へ分離
  - 評価: レイヤー違反として教科書的。依存グラフに 1 本でも逆向きの矢印があると全体が汚染される

- [ ] API scope 定義の二重管理をやめる
  - 重複対象:
    - `packages/domain/apiKey/apiKeySchema.ts`
    - `apps/frontend/src/components/api-reference/apiReferenceData.ts`
  - 評価: 手書き API リファレンス廃止と同時解決すべき。単一ソース化はドメイン駆動の基本

- [ ] shared package のエラー処理を注入式に統一する
  - 対象:
    - `packages/sync-engine/orchestration/createNavigationSync.ts`
    - `packages/sync-engine/pull/createInitialSync.ts`
  - 現状: `console.error` 直書き
  - 対応: logger / reportError / telemetry adapter を外から受ける
  - 評価: 共有パッケージが `console.error` 直呼びはテスタビリティ・監視統合の両方で詰む。DI が正しい設計

- [ ] 200 行超ファイルを凝集度ベースで分割する
  - 優先対象 (責務分離が明確):
    - `apps/frontend/src/hooks/useCSVImport.ts` (485)
    - `apps/backend/feature/activity/activityUsecase.ts` (338)
    - `apps/frontend/src/components/tasks/TasksPage.tsx` (315)
  - その他検討対象:
    - `apps/frontend/src/components/csv/CSVColumnMapper.tsx` (258)
    - `apps/mobile/src/repositories/activityRepository.ts` (240)
    - `packages/domain/csv/csvParser.ts` (234)
    - `apps/mobile/src/components/common/HamburgerMenu.tsx` (206)
    - `apps/mobile/src/components/csv/CSVImportModal.tsx` (206)
    - `packages/sync-engine/mappers/apiMappers.ts` (204)
  - 除外:
    - `apps/frontend/src/components/api-reference/apiReferenceData.ts` (338) → 「手書き API リファレンス廃止」で消える
  - 分割方針:
    - CSV: parse / validate / mapping / import execution / progress state
    - activityUsecase: query / mutation / icon / ordering
    - TasksPage: section definition / rendering / handlers
    - mappers: entity 単位分割
  - 評価: 行数ではなく凝集度で判断。機械的分割は逆効果。API 契約や shared DI を先に進めれば副次的に自然に分割される

### やる価値はある

- [ ] base64 変換ロジックを共通化する
  - 重複対象:
    - `apps/backend/feature/activity/activityRoute.ts`
    - `apps/backend/feature/activityLog/activityLogRoute.ts`
  - 評価: DRY として妥当。2 箇所なら軽量な共通化 (例: `packages/backend-shared/utils`) で十分。大仰な抽象化は不要

- [ ] `as unknown as` を本番コードから除去する
  - 本番コード対象:
    - `apps/admin-frontend/src/components/login/LoginPage.tsx`
    - `apps/mobile/src/db/expo-sqlite-web-shim.ts`
  - テスト補助コード対象:
    - `apps/backend/feature/webhook/test/polarWebhookTestHelpers.ts`
    - `apps/backend/feature/webhook/test/revenueCatTestHelpers.ts`
  - 評価: 原則として正しい。本番 2 件は個別に「なぜ必要か」を見て型宣言側で解決する

- [ ] admin frontend の最低限のテストを追加する
  - 対象: `apps/admin-frontend`
  - 現状: テスト 0 件
  - 最低ライン:
    - ログイン成功/失敗
    - 認証ガード
    - dashboard の empty/loading/error
    - destructive action の確認フロー
  - 評価: 0 件は危険信号。admin 機能は failure cost が高いので最低ラインは必須

- [ ] failure path のテストを増やす
  - 優先対象:
    - `packages/frontend-shared/hooks/useTasksPage.test.tsx`
    - `packages/frontend-shared/hooks/useDailyPage.test.tsx`
    - `apps/frontend/src/components/common/useLogForm.test.ts`
    - `packages/sync-engine` 一式
    - `apps/frontend/src/sync/initialSync.ts`
    - `apps/mobile/src/sync/initialSync.ts`
  - 評価: P0 で整合性問題を直した以上、テストで固める必要がある。P0 の完了と対になる

- [ ] `apps/mobile/src/components/csv/CSVImportModal.tsx` の文言を i18n 化する
  - 現状: 日本語文言が直書き
  - 関連確認: `packages/i18n` はテスト 0 件
  - 評価: `packages/i18n` がある以上は統一すべき。ただし i18n 基盤自体の健全性確認とセットで進める

- [ ] Web / Mobile の initial sync 差分を棚卸しする
  - 対象:
    - `apps/frontend/src/sync/initialSync.ts`
    - `apps/mobile/src/sync/initialSync.ts`
  - 現状:
    - `freezePeriods` の `.catch(() => null)` TODO が両方に残る
    - fallback 差分があり、意図的差分か不明
  - 対応: intentional / accidental に仕分ける
  - 評価: 棚卸しだけで終わらせず、差分の扱いを明文化するところまでやって初めて意味がある

### 条件付き / 再検討

- [ ] Web/Mobile で残っている共通化漏れを解消する
  - 対象:
    - `apps/frontend/src/components/setting/ScopeSelector.tsx`
    - `apps/mobile/src/components/setting/MobileScopeSelector.tsx`
    - `apps/frontend/src/components/setting/ScopeBadges.tsx`
    - `apps/mobile/src/components/setting/MobileScopeBadges.tsx`
    - `apps/frontend/src/components/contact/useContactForm.ts`
    - `apps/mobile/src/components/contact/useContactForm.ts`
    - `apps/frontend/src/components/setting/useAccountLinking.ts`
  - 対応: `packages/frontend-shared` に metadata / hook / adapter を寄せる
  - 条件: 共通化はロジック層 (hook) に留める。UI は RN と Web DOM の adapter pattern を前提にしないと型崩壊する。単純に shared に寄せない

- [ ] CSV パーサ仕様を明文化し、曖昧挙動を減らす
  - 対象: `packages/domain/csv/csvParser.ts`
  - 現状:
    - delimiter / header / date parsing が手作りで曖昧
    - クォート、エンコーディング、日付解釈の境界条件が弱い
  - 対応:
    - 対応 dialect を固定
    - 仕様テストを追加
    - 必要なら専用 parser へ置換
  - 条件: 自前パーサを仕様化するより `papaparse` 等の標準ライブラリに乗り換える判断を先にする。仕様化は捨てられない場合のフォールバック

- [ ] CSV import の Web / Mobile 機能差を解消する
  - Web:
    - `apps/frontend/src/hooks/useCSVImport.ts`
  - Mobile:
    - `apps/mobile/src/components/csv/useCSVParse.ts`
    - `apps/mobile/src/components/csv/useCSVImport.ts`
    - `apps/mobile/src/components/csv/CSVImportModal.tsx`
  - 現状:
    - Web は column mapping / fixed activity / 新規 activity 作成 / kind 解決あり
    - Mobile は単一 activity 選択前提で機能が薄い
  - 条件: 機能パリティを目的化すると過剰投資になる。ユーザーが mobile で CSV import を実際に使うかの利用実態確認が先

- [ ] `apps/mobile/src/db/expo-sqlite-web-shim.ts` の CDN 依存を解消する
  - 現状: `sql.js` / wasm をランタイムで CDN から取得
  - リスク: 可用性、供給網、オフライン、整合性
  - 対応: dev-only であることをコード/README に明記する (最小対応)
  - 条件: production は expo-sqlite ネイティブで動くので web shim は Claude Code 動作確認用の dev-only。self-host / bundle は過剰対応。「dev-only と明確化」だけで十分

- [ ] mobile の UI / 機能テストを増やす
  - 対象: `apps/mobile`
  - 現状: テスト 6 件のみ
  - 追加優先:
    - task / daily / log form
    - CSV import
    - settings / account / OAuth
    - OTA / sync failure
    - API key / subscription UI
  - 条件: RN の単体 UI テストは ROI が悪い。Detox / Maestro 等の E2E シナリオ整備を先に検討する。書き方を決めずに数だけ増やすのは非推奨

## P1.5: ドキュメント・運用整合性の修正

- [ ] `docs/release-note-dev.md` の古い構成名を現状に合わせる
  - 代表:
    - `frontend-v2`
    - `mobile-v2`
    - `docs/knowledges`

- [ ] `docs/ops/mobile-ota.md` と実ファイル構成を一致させる
  - 現状: `apps/mobile/.env` 前提
  - 実態: `apps/mobile/.env.example` がある
  - 関連スクリプト:
    - `scripts/setup-ports.js`
    - `scripts/worktree-setup.sh`

- [ ] `scripts/quality-scan.js` の対象ディレクトリを更新する
  - 現状: `DOC_DIRS = ["docs/knowledges", "docs/adr"]`
  - 対応: `docs/release-note-dev.md`, `docs/ops`, `docs/plan` など active docs も含める

- [ ] active docs と archive docs を分離して扱う
  - 方針:
    - active は常に現状一致
    - archived / diary / completed todo は historical record として stale 許容
  - 現状: stale ref が混在して品質スキャンのノイズになっている

## P2: 継続的に改善すべき運用・AI ガードレール

- [ ] 「重要ルールは CI で強制」の原則に寄せる
  - ルール候補:
    - `c.req.json<T>()` 禁止
    - 本番コードの `console.*` 禁止
    - 200 行超ファイルの新規追加禁止
    - active docs の存在しない参照禁止
    - local env ファイル追跡禁止
    - production code の TODO budget 制限

- [ ] `.claude` / `CLAUDE.md` のルールを「警告」から「失敗」に上げる箇所を選別する
  - 現状: `post-lint.js` は警告ベースのものが多い
  - 優先:
    - request validation
    - import direction
    - stale active docs
    - console usage

- [ ] intentional な技術負債に削除条件を付ける
  - 対象例:
    - `apps/frontend/src/sync/initialSync.ts`
    - `apps/mobile/src/sync/initialSync.ts`
    - `apps/backend/feature/apiKey/apiKeyUsecase.ts`
  - 現状: TODO が残っても「いつ消すか」が曖昧

- [ ] generator テンプレートの TODO を見直す
  - 対象:
    - `scripts/generate-feature.js`
    - `scripts/generate-domain.js`
  - 現状: scaffold 後にそのまま残りうる placeholder TODO が複数ある

- [ ] テスト密度の偏りを是正する
  - 現状:
    - `apps/backend`: 59
    - `apps/frontend`: 13
    - `apps/mobile`: 6
    - `apps/admin-frontend`: 0
    - `packages/domain`: 11
    - `packages/frontend-shared`: 22
    - `packages/sync-engine`: 11
    - `packages/types`: 0
    - `packages/i18n`: 0
    - `e2e`: 12
  - 対応: backend 偏重から mobile/admin/failure path に再配分

- [ ] 監視方針をコードレベルで統一する
  - 分類:
    - user-facing recoverable error
    - retryable infra error
    - fatal consistency error
    - debug-only signal
  - 現状: `console.error` / `reportError` / 握りつぶし / 再 throw の基準がファイルごとに揺れている

- [ ] 複数エンティティ更新の共通パターンを決める
  - 対象例:
    - task 完了 + activity log 生成
    - icon file + DB metadata
    - API key validation + `lastUsedAt` 更新
  - 対応: transaction / saga / outbox / best-effort の使い分けを明文化

## P2: 低優先度だが揃えておくと効く整理

- [ ] `apps/frontend/src/components/tasks/TasksPage.tsx` の section rendering をデータ駆動化する
- [ ] `apps/mobile/src/repositories/activityRepository.ts` を CRUD / query / sync 補助に分割する
- [ ] `packages/sync-engine/mappers/apiMappers.ts` を entity ごとに分割する
- [ ] `scripts/seed-dev-data.ts` と `scripts/seedDevData.ts` の命名を一本化する
- [ ] `ADMIN_ALLOWED_EMAILS` と `VITE_CONTACT_EMAIL` の運用上の結合を見直す
  - 対象: `.github/workflows/deploy.yml`
  - 現状: admin 許可メールと contact email が同じ GitHub Vars 由来
  - 対応: 意図的なら ADR/ops に明記、そうでなければ分離
- [ ] `apps/frontend/wrangler.toml` / build artifact 名の `-v2` 残存を意図として固定するか、名称整理する
  - 例:
    - `actiko-frontend-v2`
    - `dist-frontend-v2`

## 完了条件

- [ ] 壊れた期待値を前提にしたテストがなくなっている
- [ ] 本番コードで `console.*` / `c.req.json<T>()` / `as unknown as` が残っていない
- [ ] active docs の存在しない参照が 0
- [ ] PR CI で backend / frontend / admin / mobile の lint / typecheck / test / build が揃っている
- [ ] multi-step 更新の失敗時整合性が仕様化され、テストで担保されている
- [ ] API reference と実ルート定義が単一ソース化されている
- [ ] Web/Mobile の主要機能差分が意図的なものだけになっている
