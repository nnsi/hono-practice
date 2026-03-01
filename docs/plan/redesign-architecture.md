# アーキテクチャ再設計計画

前提: `docs/todo/shared-code.md` の改善計画のうち #1(domain責務分離), #8(platform抽象層) は実施済み。
本計画はその続きとして、パッケージ構成の最終整理を行う。

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
```

依存:
- T2 は T1 完了後
- T3, T4, T5 は並列可だが T5 は T4 完了後が安全
- T6 は T5 完了後（types-v2 の import パスが確定してから）
- T7 は T5, T6 完了後

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

## shared-code.md との対応

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
