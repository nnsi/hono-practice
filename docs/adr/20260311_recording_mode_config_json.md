# recordingModeConfig の JSON カラム永続化

## ステータス

決定

## コンテキスト

記録モードシステムの導入に伴い、各モードの設定（counter の step 値 `[1, 5, 10]`、binary のラベル等）を永続化する必要がある。

当初は「`activity_kind_steps` のようなテーブルを作って管理する」案があった。

## 決定事項

別テーブルではなく、`activity` テーブルに `recording_mode text` + `recording_mode_config text`（JSON）の2カラムを追加する。

### 別テーブル案を却下した理由

1. **同期コスト**: 別テーブルにすると sync エンジンに新しいエンティティが増える（`_syncStatus` 管理、chunk 分割、serverWins 処理の全てを新テーブル用に実装する必要がある）
2. **命名の混乱**: steps は Activity 単位の設定であって ActivityKind 単位ではない（`activity_kind_steps` は誤解を招く）
3. **正規化の過剰**: `[1, 5, 10]` 程度の配列を正規化する意味が薄い
4. **拡張性**: 将来 binary モードのラベル設定等も必要になるが、モードごとにテーブルを増やすのは辛い。JSON カラムなら discriminated union で全モードの設定を1カラムで扱える

### 型設計

Zod discriminated union で `recordingMode` をキーにバリデーション:

```typescript
// counter: { steps: number[] }
// binary: { labels: [string, string] }  ← 後に kinds ベースに変更
// timer/manual/numpad/check: null
```

`parseRecordingModeConfig(json)` が不正 JSON を安全に null に落とすため、DB からゴミが読まれても壊れない。

### 既存の `quantityOption` の発見と削除

`CreateActivityRequest` に `quantityOption: z.array(z.number()).optional()` というフィールドが既に存在していたことが判明。これは steps のために作られていたが、DB にもリポジトリにも対応がない死んだフィールドだった。`recordingModeConfig` で完全に置き換えられるため削除。

### マイグレーション

- **PostgreSQL**: migration 0025 で2カラム追加 + timer backfill SQL（`isTimeUnit` に該当する既存 Activity の `recording_mode` を `"timer"` に更新）
- **Dexie (frontend-v2)**: 非インデックスフィールドはスキーマレスなのでバージョン変更不要。version(4) の upgrade handler でインラインの `isTimeUnit` 判定で backfill
- **SQLite (mobile-v2)**: `ALTER TABLE` + `SCHEMA_VERSION` 2→3 にインクリメント

## 結果

- sync エンジンの変更ゼロで記録モード設定が永続化される
- 全プラットフォーム（PostgreSQL / Dexie / SQLite）で同一のデータ構造
- 新モード追加時は Zod スキーマに union メンバーを追加するだけ

## 備考

- Dexie の upgrade callback 内で `isTimeUnit` ロジックをハードコードしている（ドメインの `isTimeUnit` を import せず文字列リテラルを使用）。upgrade は一度しか走らないため、新しい単位追加時にここを更新し忘れても既に upgrade 済みの端末には影響しない。
