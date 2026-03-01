# アーキテクチャ再設計計画

「0→1で作り直すなら理想のアーキテクチャはどうなるか」を起点に、現実のコードベースとの差分を埋めるリファクタリング計画。

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
旧 `packages/types`(v1) に定義されていたものを新 `packages/types` に統合する。

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
3. 旧 `packages/types`(v1) を参照していた場合、新 `packages/types` に移植するか feature 内にインライン化

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
- v1 のテストパターンに準拠: Drizzle + インメモリ DB でのインテグレーションテスト
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

## T9: オフラインファースト同期設計の改善

### 目的
現行の v2 同期設計（Dexie.js + useLiveQuery + per-entity sync endpoints）は正しい判断。
その上で、sync-engine の仕様散在と LAST_SYNCED_KEY 管理の分散を解消する。

### 現行設計の評価
維持するもの:
- **Dexie.js**: IndexedDB 直接操作より圧倒的に DX が良い。維持
- **useLiveQuery**: リアクティブ更新の仕組みとして正しい選択。維持
- **per-entity sync endpoints**: エンティティ単位の sync API（since + batch upsert + LWW）。維持

### 改善内容

#### 9-1. sync-engine をプロトコルとして仕様化
現状の問題: 同期ロジックが散在している。
- `chunkedSync.ts` が frontend 側（sync-engine パッケージ）にある
- batch upsert ロジックが backend 側（feature-v2 の各 repository）にある
- conflict resolution（server wins）のルールが暗黙的

改善:
- 「since timestamp + batch upsert + conflict resolution = server wins」をプロトコルドキュメントとして定義
- 実装がプロトコルに従う形にし、frontend/backend 双方がどのルールで動いているか明示する

#### 9-2. LAST_SYNCED_KEY の管理を一元化
現状の問題: LAST_SYNCED_KEY が localStorage / Dexie / クエリパラメータの3箇所に散在している。
- initialSync で localStorage から読む
- クエリパラメータとして API に渡す
- 同期完了時に localStorage に書く

改善:
- LAST_SYNCED_KEY の read/write を sync-engine 内に閉じ込める
- フロントエンドのコンポーネントやフックが直接 localStorage を触らない
- sync-engine が単一の管理ポイントとなる

---

## 最終到達状態

```
apps/
  backend/
    feature/           ← 統合済み（v1専用 + v2移行済み、handler品質統一）
  frontend-v2/         ← 同期アーキテクチャ刷新済み
  mobile-v2/
  tail-worker/         ← 維持

packages/
  domain/              ← 純粋（Entity/VO/Rules）
  types/               ← リクエスト/レスポンススキーマ（旧types-v2 + v1必要分）
  sync-engine/         ← 同期/mapper/http（T9でプロトコル仕様化 + LAST_SYNCED_KEY一元化）
  platform/            ← 環境抽象
  frontend-shared/     ← UI非依存共有ロジック

infra/
  drizzle/             ← pnpmワークスペースパッケージ

削除:
  packages/api-contract/
  packages/types-v2/   （リネーム済み）
  packages/types/      （旧v1・削除済み）
  feature-v2/          （feature/ に統合済み）
```

- `.npmrc` から `shamefully-hoist=true` が除去されている
- backend handler は v1 水準の品質（エラーハンドリング・バリデーション・テスト）が統一されている
- sync-engine がプロトコル仕様に基づいた単一管理ポイントとして機能している（Dexie.js + useLiveQuery は維持）
