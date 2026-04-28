# Property-based Tests (`packages/domain/test/_property`)

ここには `@fast-check/vitest` を使った property test を集める。

## 目的

- 日時境界（タイムゾーン跨ぎ・月跨ぎ・年跨ぎ・うるう年）を機械的にガードする
- AIエージェントが時刻ロジックを実装した直後に property test がガードレールとして動作する
- 過去の UTC / timezone bug が回帰しないことを保証する

## 失敗時の再現方法

`@fast-check/vitest` は失敗時に **counterexample と seed を出力する** ため、シードを使って同じ反例を再現できる。

```bash
# 例: 出力された seed を使って 1 ケースだけ再実行
pnpm vitest run packages/domain/test/_property/<file>.test.ts -- --testNamePattern "<test name>"
```

特定の seed を固定して走らせたい場合は、`fc.assert(prop, { seed, path })` の形で seed と path を指定して書き直す。詳しくは [fast-check の Replay 機能](https://fast-check.dev/docs/configuration/seed-and-path/) を参照。

## ガイドライン

- `@fast-check/vitest` の `it.prop([...])` または `test.prop([...])` を使う
- arbitrary は `arbitraries.ts` に共通化する（同じ日付ジェネレータの再発明を避ける）
- 例示テストで覆える範囲は既存の `*.test.ts` に残し、ここでは「境界条件を全網羅したい」「順序非依存」「冪等」などの不変条件にフォーカスする
