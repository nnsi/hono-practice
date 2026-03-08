# 共通化アーキテクチャ改善計画（実コードベース）

本ドキュメントは、実際のコード構成（packages/domain に sync・fetch・token・platform が内包、frontend-shared に直接依存混在、Zod重複定義、types-v2並存、backend型逆参照など）に基づいた、具体的かつ実装単位の改善項目を列挙する。

**前提**: React Native版はフロントエンド共通化戦略の完了後に公開予定。本計画はRN版対応を見据えた設計とする。

---

# 実施順の依存関係

項目間には直列依存がある。並行可能なものは明示する。

```
#4 backend型逆参照解消
 └→ #3 DI統一（api-contractが決まりDI境界が確定する）
     └→ #1 domain責務分離（DI対象確定後に切り出し範囲が決まる）
         └→ #8 platform抽象層（切り出し後のインターフェースから自然導出）

#5 Zod重複削除 … 即実行可（他に依存なし）
#6 apiMapper是正 … #1と同時実施が効率的
#7 types統合 … backend v2移行進捗に依存、上記と並行可
#9 domain index … #1完了後に大部分が自然解消
#2 frontend-shared index … #3と同時実施が効率的
```

---

# 1. domain層の責務混在の分離（最優先）

## 現状（コード事実）
- packages/domain/index.ts が sync/apiMappers, authenticatedFetch, tokenStorage, platformAdapter, chunkSync をexport
- authenticatedFetch が refresh token・credentials・fetch再試行を内包
- これは純粋ドメインではなくアプリ/インフラ責務

## 改善方針
domainを「純粋ビジネスルール + 型 + 不変条件」のみに限定する

## 具体的リファクタ構造
packages/
  domain/            ← 純粋層のみ
  sync-engine/       ← 同期・API・mapper
  platform/          ← fetch/storage/clock抽象

## 移動対象ファイル（実ファイルベース）
- packages/domain/sync/apiMappers.ts → packages/sync-engine/mappers/
- packages/domain/sync/authenticatedFetch.ts → packages/sync-engine/http/
- packages/domain/sync/tokenStorage.ts → packages/platform/auth/
- packages/domain/sync/platformAdapter.ts → packages/platform/
- packages/domain/sync/chunkSync.ts → packages/sync-engine/core/

## index.tsの修正
変更前:
export * from "./sync/apiMappers";
export * from "./sync/authenticatedFetch";

変更後:
export * from "./activity";
export * from "./goal";
export * from "./validation";
export * from "./errors";

---

# 2. frontend-sharedの公開境界未定義の修正

## 現状（コード事実）
- tsconfig: @packages/frontend-shared → index.ts を参照
- 実際には packages/frontend-shared/index.ts が存在しない
- hooksディレクトリ直参照状態

## 改善内容
エントリポイントを明示し、公開APIを固定する

## 追加ファイル
packages/frontend-shared/index.ts

内容:
export * from "./hooks/useSyncEngine";
export * from "./hooks/useSubscription";
export * from "./hooks/useGoals";

## 目的
- 破壊的変更の影響範囲限定
- 内部実装の隠蔽
- モノレポ境界の明確化

---

# 3. 共有層の依存方針統一（DI vs 直接importの混在解消）

## 現状（実コード差異）
useSyncEngine.ts:
- React Hooks をDI（良い）

useSubscription.ts:
- react-query 直接import
- hono/client 直接import
- backend型 import

## 改善方針
共有層は「環境非依存」に統一する

## 修正例（設計）
hooks/
  core/
    subscriptionCore.ts ← 純粋ロジック
  adapters/
    useSubscription.web.ts
    useSubscription.native.ts

## DIインターフェース定義
type QueryClientAdapter = {
  useQuery: Function;
};

type ApiClientAdapter = {
  get: Function;
  post: Function;
};

これをshared層に注入する構造に変更する。

---

# 4. backend型への逆参照の解消

## 現状（実コード）
packages/frontend-shared/hooks/useSubscription.ts
import type { AppType } from "@backend/app";

## 問題
依存方向:
frontend-shared → backend
（逆流構造）

## 改善構造
packages/
  api-contract/
    app-type.ts

## 修正内容
1. backendのAppTypeを api-contract に移動
2. backend:
   import { AppType } from "@packages/api-contract"
3. frontend-shared:
   import type { AppType } from "@packages/api-contract"

これにより依存方向が一方向になる。

---

# 5. Zod重複定義の解消

## 現状（実package.json）
root: zod ^4.0.1
packages/domain: zod ^4.0.1

バージョン分裂（v3/v4）は存在しない。ただしdomainのpackage.jsonに重複定義があり、pnpmの依存解決で意図しないduplicateが発生しうる。

## 改善手順
1. packages/domain/package.json から zod を削除
2. pnpm install で root の zod に統一
3. 型検証（pnpm run tsc）

## 期待効果
- bundle重複防止
- schema instanceof整合性

---

# 6. apiMapperのサイレント補正の是正

## 現状（実コード）
toISOString:
不正値 → 現在時刻に変換

## 改善方針
データ破損の早期検出に変更

## 修正仕様
- invalid: throw DomainValidateError
- null/undefined: 明示的エラー
- フォールバック自動補完の廃止

## 影響範囲
packages/domain/sync/apiMappers.ts（移動後は sync-engine）

---

# 7. v1 / v2 型層の整理（types と types-v2）

## 現状
- packages/types
- packages/types-v2
- 両方tsconfig paths参照可能

## 改善方針
段階的統合

## フェーズ設計
Phase 1:
types-v2 を唯一の契約層に指定

Phase 2:
backend feature-v2 完全移行

Phase 3:
packages/types 削除

---

# 8. platform抽象層の明文化（RN/Web/Backend差分の正式吸収）

## 追加パッケージ
packages/platform/

## 抽象インターフェース（確定）
- HttpClient
- TokenStorage

## 抽象インターフェース（要検証）
以下はWeb/RNで実際に差分があるか確認してから追加する。不要なら定義しない。
- Clock — Date.now()がWeb/RN両方で同一なら不要
- UUIDGenerator — crypto.randomUUID()の対応状況次第

例:
type HttpClient = {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
};

## 実装配置
apps/web → platform/web/
apps/mobile → platform/native/
apps/backend → platform/server/

## 注意
#1（domain責務分離）完了後にインターフェースを設計すること。先に抽象を定義すると実態と乖離する。

---

# 9. domain indexの肥大化抑制

## 現状
index.ts が横断export（sync, csv, image, validation, errors）

## 改善
サブドメイン単位exportに変更

推奨:
@packages/domain/activity  
@packages/domain/goal  
@packages/domain/errors  

---

# 最終到達状態

packages/
  domain/            ← 純粋（Entity/ValueObject/Rules）
  sync-engine/       ← 同期/mapper/http
  platform/          ← 環境抽象
  api-contract/      ← backend共有型
  frontend-shared/   ← UI非依存共有ロジック（公開indexあり）

apps/
  backend/
  frontend/
  mobile/

※ usecase/ パッケージは現状コードに対応物がない。共通化完了後に必要性が明確になった時点で検討する。

この状態になると、
- 依存方向の逆流ゼロ
- 環境差完全分離（Web/RN両対応）
- ドメイン純度100%
