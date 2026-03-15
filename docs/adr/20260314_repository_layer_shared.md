# Web/Mobile リポジトリ層の共通化（DbAdapter 抽象化）

## ステータス

決定

## コンテキスト

Web (frontend-v2/Dexie) と Mobile (mobile-v2/SQLite) のリポジトリ層に約2,000行の重複が存在していた。CRUD、sync upsert、upsert 競合検出（pending 保護 + updatedAt 比較）が両プラットフォームで独立に実装されており、片方のバグ修正がもう片方に反映されないリスクがあった。

ドメインロジック・フックファクトリは既に `packages/frontend-shared` で共有済みだったが、リポジトリ層だけが未共有だった。

## 決定事項

### 選択肢の評価

| 案 | 内容 | 採否 |
|----|------|------|
| A: ロジック抽出 | DbAdapter で DB 操作を抽象化、ビジネスロジックを共通ファクトリに集約 | **採用** |
| B: 共通テスト + CI 乖離検知 | 両プラットフォームに同じテストを走らせ、挙動の乖離を CI で検出 | 却下（重複は残る） |
| C: フル抽象化 | SQL/Dexie 両方の操作を完全に抽象レイヤーで隠蔽 | 却下（過剰。アイコン管理等のプラットフォーム固有処理がアダプタのコストを上回る） |

### 設計

```
packages/frontend-shared/repositories/
  ├─ syncHelpers.ts              # filterSafeUpserts（全リポジトリ共通の upsert 競合検出）
  ├─ taskRepositoryLogic.ts      # newTaskRepository(adapter) ファクトリ
  ├─ activityLogRepositoryLogic.ts
  ├─ goalRepositoryLogic.ts
  ├─ goalFreezePeriodRepositoryLogic.ts
  └─ activityRepositoryLogic.ts  # 最も複雑（Activity + ActivityKind の2エンティティ管理）

apps/frontend-v2/src/repositories/
  └─ *Repository.ts              # Dexie を DbAdapter に適合させる薄いアダプタ

apps/mobile-v2/src/repositories/
  └─ *Repository.ts              # SQLite を DbAdapter に適合させる薄いアダプタ
```

`DbAdapter` インターフェースで以下を抽象化:
- `getAll()`, `getById()`, `bulkUpsertSynced()`, `create()`, `update()`, `softDelete()`
- `getPending()`, `markSynced()`, `markFailed()`
- `getNextOrderIndex()`（Activity のみ、Web: lexicalOrder / Mobile: numeric increment）

### 共通化しなかったもの

activityRepository のアイコン管理メソッド（10メソッド）は共通化していない。ロジックがなく純粋に DB 操作を書き換えているだけで、共通化してもアダプタにパススルーするだけ。プラットフォーム間でテーブル構造も異なる（Dexie テーブル vs SQLite テーブル）ため、共通化しても保守コストは下がらない。

### upsert の防御層変更

Mobile 側の `upsertFromServer` が元々 SQL `WHERE` 句で二重防御していた（JS + SQL）。共通化により `filterSafeUpserts` で JS 側のみの単一防御になった。共通ロジックが正しく動作すれば問題ないが、`bulkUpsertSynced` を別の文脈で直接呼ぶケースが将来出た場合にリスクになる。

### テスト

インメモリアダプタを使った共通テストを5ファイル・112テスト作成。実際のデータ状態を検証する形式（モック呼び出しの検証ではなく、store の中身を直接確認）。

## 結果

| | Before (Web+Mobile) | After (Web+Mobile) | 共通 |
|---|---|---|---|
| プラットフォーム固有コード | 2,584行 | 1,693行 (-34%) | — |
| 共通ビジネスロジック | 0行 | — | 791行 |
| 共通テスト | 0行 | — | 3,552行 |

- `filterSafeUpserts` の修正が1箇所で両プラットフォームに反映される
- 既存の DI パターン（フックファクトリ）の自然な延長で、学習コストが低い

## 備考

- 1エージェントに5ファイル同時の書き換えを任せると失敗する場合がある（Mobile エージェントが書き換えずに完了報告した）。大規模リファクタでは1エージェント1-2ファイルに分割すべき。
