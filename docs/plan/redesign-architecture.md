# アーキテクチャ再設計計画

前提:
- `docs/todo/shared-code.md` の改善計画のうち #1(domain責務分離), #8(platform抽象層) は実施済み
- `docs/todo/archived/offline-sync-redesign.md` のオフライン同期再設計案を本計画に統合

本計画はパッケージ構成の整理 + backend品質改善 + 同期アーキテクチャ再設計を行う。

---

## 実施順の依存関係

```
Phase 1 (直列・先行)
  T1: infra パッケージ化
  T2: shamefully-hoist 削除

Phase 2 (並列可)
  T3: packages/api-contract 削除 → backend直接参照
  T4: packages/types 削除（v1）
  T5: packages/types-v2 → packages/types にリネーム
  T6: backend feature / feature-v2 統合

Phase 3 (Phase 2 完了後)
  T7: types-v2 リネーム後の旧v1型の統合（必要なもののみ）
  T8: v2 handler 品質改善（v1水準への引き上げ）

Phase 4 (Phase 3 完了後)
  T9: オフラインファースト同期アーキテクチャ再設計
```

依存:
- T2 は T1 完了後
- T3, T4, T5 は並列可だが T5 は T4 完了後が安全
- T6 は T5 完了後（types-v2 の import パスが確定してから）
- T7 は T5, T6 完了後
- T8 は T6 完了後（feature統合後にhandlerを改善する。統合前にやると二重作業）
- T9 は T8 完了後（handler品質が安定してから同期層を再構築）

---

## T1: infra パッケージ化

### 目的
`infra/drizzle/` を pnpmワークスペースパッケージにし、`shamefully-hoist=true` を不要にする。

### 変更内容
1. `infra/drizzle/package.json` を作成（`@packages/infra-drizzle` 等）
2. `pnpm-workspace.yaml` に `infra/*` を追加
3. backend の `package.json` に `@packages/infra-drizzle` を依存追加

### スコープ
drizzle のみ。wrangler設定等は含めない。

---

## T2: shamefully-hoist 削除

### 目的
T1 完了後、`.npmrc` から `shamefully-hoist=true` を削除し、厳密な依存解決に移行する。

### 変更内容
1. `.npmrc` から `shamefully-hoist=true` を削除
2. `pnpm install` で依存解決を検証
3. 不足する明示的依存があれば各パッケージの `package.json` に追加

### リスク
暗黙的にhoistされた依存に頼っているパッケージがあれば壊れる。`pnpm install && pnpm run ci-check` で検証。

---

## T3: packages/api-contract 削除 → backend直接参照

### 目的
Honoの型付きクライアント（`hc`）の利点を活かし、`AppType` を backend から直接importする。中間パッケージ `api-contract` を廃止する。

### 現状
```
packages/api-contract/index.ts:
  export type { AppType } from "@backend/app";
```
参照元（4箇所）:
- `apps/frontend-v2/src/utils/apiClient.ts`
- `apps/mobile-v2/src/utils/apiClient.ts`
- `packages/frontend-shared/hooks/useApiKeys.ts`
- `packages/frontend-shared/hooks/useSubscription.ts`

### 変更内容
1. 上記4ファイルの import を `@packages/api-contract` → `@backend/app` に変更
2. `packages/api-contract/` ディレクトリを削除
3. 各 `package.json` / `tsconfig.json` から api-contract への参照を削除

### 補足
依存方向は `frontend → backend(型のみ)` となる。Honoの設計思想上これは正当。AppType は型のみの import なのでランタイム依存は発生しない。

---

## T4: packages/types 削除（v1）

### 目的
v1 の型パッケージを廃止する。現在アプリコードからの import は 0件。

### 現状
```
packages/types/
  index.ts        — domain からエンティティ型を re-export
  request/        — v1 API 用リクエスト型（18ファイル）
  response/       — v1 API 用レスポンス型（17ファイル）
```

### 変更内容
1. `packages/types/` ディレクトリを削除
2. tsconfig paths / package.json から `@packages/types` への参照を削除

### 注意
v1 feature ルートが request/response の型をローカル定義しているか確認が必要。types パッケージを参照している場合はインライン化してから削除する。

---

## T5: packages/types-v2 → packages/types にリネーム

### 目的
v2 がデファクトスタンダードになったため、`-v2` サフィックスを外して正式名称にする。

### 現状
`@packages/types-v2` を参照しているのは backend feature-v2 の16ファイル。

### 変更内容
1. `packages/types-v2/` を `packages/types/` にリネーム（T4 完了後）
2. `package.json` の `name` を `@packages/types` に変更
3. 全参照の import パスを `@packages/types-v2` → `@packages/types` に一括置換
4. tsconfig paths を更新

---

## T6: backend feature / feature-v2 統合

### 目的
`feature/` と `feature-v2/` の二重構造を解消し、単一の `feature/` に統合する。

### 現状
- feature-v2: `activity`, `activity-log`, `goal`, `task`（v2 sync API。アクティブ）
- feature のみ: `activitygoal`, `apiKey`, `auth`, `r2proxy`, `subscription`, `user`（v1 オンライン前提。アクティブ）

### 変更内容
1. `feature-v2/` 配下の4ドメインを `feature/` に移動（v2 実装で v1 を上書き）
2. v1 のみの6ドメインは `feature/` にそのまま残す
3. `feature-v2/` ディレクトリを削除
4. `app.ts` のルート登録を更新
5. 各ファイル名から `V2` サフィックスを除去するかは要判断（一括リネームのコスト vs 命名の一貫性）

### v1 → v2 移行済みドメインの扱い
`feature/activity`, `feature/activityLog`, `feature/goal`, `feature/task` の旧v1実装は削除する。

---

## T7: 旧v1型の必要分を統合typesに追加

### 目的
v1 feature ルート（auth, apiKey, subscription 等）が使うリクエスト/レスポンス型のうち、
現在 `packages/types`(v1) に定義されていたものを新 `packages/types` に統合する。

### 対象候補
v1 feature で外部型を必要とするもの:
- `auth`: `LoginRequest`, `GoogleLoginRequest`, `AuthResponse`, `LoginResponse`
- `apiKey`: `CreateApiKeyRequest`, `ApiKeyResponse`
- `subscription`: `SubscriptionResponse`
- `user`: `CreateUserRequest`, `GetUserResponse`
- etc.

### 変更内容
1. 各v1 feature ルートが型をどこから取得しているか精査
2. ローカル定義済みならそのまま
3. `packages/types`(旧v1) を参照していた場合、新 `packages/types` に移植するか feature 内にインライン化

### 命名方針
v2 の命名規則（`SyncXxxRequest` / `SyncXxxResponse`）に合わせる。
例: `CreateActivityLogRequest` → v1用はそのまま、v2は `UpsertActivityLogRequest`（既存）。

---

## T8: v2 handler 品質改善（v1水準への引き上げ）

### 目的
v2 の sync API handler は MVP として実装されたため、v1 と比較して品質差がある。
feature統合（T6）後に v1 の設計パターンに合わせて引き上げる。

### 現状の品質差（v1 vs v2）

| 観点 | v1 | v2（現状） |
|---|---|---|
| エラーハンドリング | 集約（AppError + throw） | 混在（route で JSON返却 / usecase で throw） |
| レスポンスバリデーション | 双方向 Zod（入力 + 出力） | 入力のみ（出力は未検証） |
| ドメインエンティティ | 使用（createXxxEntity） | 未使用（raw Drizzle rows） |
| レイヤー責務 | 厳密分離 | repository にビジネスロジック漏出 |
| トランザクション | TransactionRunner で明示管理 | 単発 upsert のみ |
| テスト | CRUD 全操作 + 失敗パス | sync 特化（CRUD テスト不足） |
| APM スパン | DB + Storage + 計算 | DB のみ |

### 改善内容

#### 8-1. エラーハンドリング統一
- route 内の `safeParse` + `c.json(error)` パターンを廃止
- v1 同様 handler 層で Zod パース → 失敗時 `throw AppError`
- グローバルエラーハンドラで統一的にレスポンス生成

#### 8-2. レスポンスバリデーション追加
- handler 層で出力を Zod スキーマでパース
- 不正な出力はサーバー側で検出（500 を返す）
- レスポンス型を `packages/types` に定義

#### 8-3. ドメインエンティティの使用
- repository が返す raw rows を handler/usecase でドメインエンティティに変換
- ドメインエンティティ経由でビジネスルールを適用

#### 8-4. レイヤー責務の修正
- repository の `getGoalActualQuantity` 等のビジネスロジックを usecase に移動
- repository は純粋なデータアクセスに限定
- upsert の `setWhere` 条件（LWW 判定）は sync ロジックとして usecase に移動

#### 8-5. テスト拡充
- **v1 のテストパターンに準拠**: Drizzle + インメモリ DB でのインテグレーションテスト
- 各ドメインに route テスト + usecase テストを追加
- sync 特化テスト（LWW, serverWins）は維持しつつ、通常の CRUD テストを補完

#### 8-6. APM スパン追加
- 計算処理（goal balance 等）のスパンを追加
- v1 で実施済みの粒度に合わせる

### v2 の良い設計は維持
以下は v2 の方が優れており、改善対象にしない:
- LWW（Last-Write-Wins）コンフリクト解決
- serverWins 検出と返却
- 所有権バリデーション（親レコードの所有確認）
- 時間境界チェック（updatedAt > now + 5min の拒否）

---

## T9: オフラインファースト同期アーキテクチャ再設計

### 目的
`docs/todo/archived/offline-sync-redesign.md` の提案に基づき、同期アーキテクチャをゼロから再構築する。
現行の複雑な同期システムをシンプルな設計に置き換える。

### 背景
現行システムの問題:
- 多層的アーキテクチャ（SyncManager, SyncQueue, hooks, adapters）の絡み合い
- オンライン/オフラインで処理パスが分岐し複雑
- CustomEvent ベースの通信で状態追跡困難
- エンティティタイプごとの処理が汎用化されていない
- テスト困難（モック対象が多すぎる）

### 設計方針
1. **シンプルさ優先** — 最小限の抽象化
2. **単一責任** — 各コンポーネントの責務を明確に
3. **テスタブル** — 依存を最小限に
4. **デバッガブル** — 処理フローを追いやすく

### フェーズ構成

#### Phase A: 既存同期インフラの削除
- `packages/frontend-shared/sync/` 削除
- `apps/backend/feature/sync/` 削除（v1 バッチ同期 API）
- 同期関連フック・サービスの削除
- 同期キュー関連テーブルの削除（sync_metadata, sync_queue）
- 削除後: 全操作が直接 API 呼び出し。オフライン時はエラー表示。

#### Phase B: 最小限の同期実装
- Zustand ストアで同期キューを管理（イベントベース廃止）
- 汎用 `useSyncedMutation` フック（エンティティ非依存）
- SimpleSyncManager（インターバル + online イベント）
- オフライン時: ローカル保存 + 楽観的更新
- オンライン復帰時: 自動送信

#### Phase C: バックエンド同期処理のリファクタ
- EntitySyncStrategy パターン導入（エンティティごとの処理を分離）
- 共通 `processSyncItem` に CREATE/UPDATE/DELETE を集約
- 冪等性チェック・コンフリクト解決の一元化
- v2 の LWW / serverWins ロジックは Strategy 内に組み込む

#### Phase D: 段階的な機能追加
- バッチ処理
- コンフリクト解決 UI
- エラーハンドリング改善

### 詳細設計
`docs/todo/archived/offline-sync-redesign.md` を参照。
コア型定義・フック設計・バックエンド Strategy パターンの実装例あり。

---

## 最終到達状態

```
apps/
  backend/
    feature/           ← 統合済み（v1専用 + v2移行済み）
  frontend-v2/
  mobile-v2/
  tail-worker/         ← 維持

packages/
  domain/              ← 純粋（Entity/VO/Rules）
  types/               ← リクエスト/レスポンススキーマ（旧types-v2）
  sync-engine/         ← 同期/mapper/http
  platform/            ← 環境抽象
  frontend-shared/     ← UI非依存共有ロジック

infra/
  drizzle/             ← pnpmワークスペースパッケージ

削除:
  packages/api-contract/
  packages/types-v2/   （リネーム済み）
  packages/types/      （旧v1・削除済み）
```

`.npmrc` から `shamefully-hoist=true` が除去されている。

---

## 関連ドキュメントとの対応

### shared-code.md との対応

| shared-code.md | 状態 | 本計画での対応 |
|---|---|---|
| #1 domain責務分離 | 実施済み | - |
| #2 frontend-shared公開境界 | 未着手 | 本計画スコープ外（別途） |
| #3 DI統一 | 未着手 | 本計画スコープ外（別途） |
| #4 backend型逆参照解消 | api-contract経由で存在 | T3 で解消 |
| #5 Zod重複削除 | 未確認 | 本計画スコープ外（独立実施可） |
| #6 apiMapperサイレント補正 | 未着手 | 本計画スコープ外（別途） |
| #7 v1/v2型統合 | 未着手 | T4, T5, T7 で実施 |
| #8 platform抽象層 | 実施済み | - |
| #9 domain index肥大化 | 部分的に解消 | 本計画スコープ外（別途） |

### offline-sync-redesign.md との対応

| 提案内容 | 本計画での対応 |
|---|---|
| フロントエンド同期簡素化 | T9 Phase A, B |
| バックエンド Strategy パターン | T9 Phase C |
| クリーンスレート移行戦略 | T9 Phase A（削除→検証→再構築） |
| バッチ同期 API | T9 Phase D |
