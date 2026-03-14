# shamefully-hoist 撤去 + 依存管理整理

## ステータス

決定

## コンテキスト

`.npmrc` に `shamefully-hoist=true` が設定されており、pnpm の厳格な依存解決を無効化していた。過去の日記を遡ると、この設定が原因で以下の問題が繰り返し発生していた:

- drizzle-orm が8重複
- hono のバージョン不一致（root と apps/backend で異なるバージョンが参照される）
- React 18/19 のゴースト依存

加えて、root `package.json` の dependencies に `biome@0.3.3`（npm上の別パッケージ）が残っており、本来の `@biomejs/biome` のバイナリをシャドウしていた。つまり `pnpm run fix` で実行されていた biome は正しいバイナリではなかった。

## 決定事項

1. **`.npmrc` から `shamefully-hoist=true` を削除**。過去のセッションで積み上げた修正（`pnpm.overrides` によるバージョン統一、各パッケージの明示的依存宣言）により、hoist なしでも全チェックが通る状態になっていた。

2. **root dependencies から `biome@0.3.3` を削除**。これにより `@biomejs/biome` が正しく解決されるようになり、45個の a11y リントエラーが顕在化した。a11y ルールは個人開発では過剰なため biome config で無効化。

3. **hono のバージョンを `pnpm.overrides` で統一**（`"hono": "4.12.3"`）。root と apps/backend で異なるバージョンが参照される型不一致問題を根本解決。

## 結果

- pnpm の厳格な依存解決が有効になり、依存の重複・不一致が構造的に防止される
- biome のリント結果が正確になった（シャドウバイナリの排除）
- CI で `drizzle-orm` の解決に失敗する副作用が発生 → root devDependencies に `drizzle-orm` `@electric-sql/pglite` を追加して解決

## 備考

- shamefully-hoist 撤去後、CI でのみテストが落ちる問題が発生した。ローカルでは前回のインストール状態が残っていたため再現しなかった。`node_modules` 削除 + クリーンインストールでローカル再現を確認してから修正すべきだった。
