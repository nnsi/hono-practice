# expo-sqlite Web shim のネストトランザクション対応

## ステータス

決定

## コンテキスト

mobile-v2 は expo-sqlite をネイティブ DB として使用し、React Native Web での動作確認用に `expo-sqlite-web-shim.ts`（sql.js ベースのインメモリ SQLite shim）を提供している。

Tier 1 Debt 機能の実装後、mobile-v2 の Web 版でリロードするとデータが完全に空になる問題が発生した。サーバーにはデータがあるため、sync が途中で壊れている状態だった。

### 根本原因: 2段階のバグ

**第1段階**: `withTransactionAsync` メソッドが shim に未実装。`initialSync.ts` がこのメソッドを呼ぶと TypeError が発生し、`useAuth.ts` の空 catch (`catch { }`) に飲まれてログインも sync も失敗する。

**第2段階**: `withTransactionAsync` を実装しても、`"cannot start a transaction within a transaction"` エラーが発生。`upsertActivities` 等のリポジトリ関数が内部で `db.execAsync("BEGIN")` / `db.execAsync("COMMIT")` を呼んでおり、外側の `withTransactionAsync` が発行した `BEGIN` とネストする。sql.js はネストトランザクションを直接サポートしない。

## 決定事項

`WebSQLiteDatabase` にトランザクション深度カウンタ (`txDepth`) を追加し、`execAsync` でトランザクション制御文を検出した場合、ネスト時は SAVEPOINT/RELEASE/ROLLBACK TO に自動変換する。

```
withTransactionAsync → BEGIN (txDepth=1)
  └ upsertActivities → execAsync("BEGIN")
      → txDepth>0 なので SAVEPOINT sp_N に変換
      → ... INSERT ...
      → execAsync("COMMIT") → RELEASE SAVEPOINT sp_N に変換
  └ upsertLogs → 同上
withTransactionAsync → COMMIT (txDepth=0)
```

`ROLLBACK` も同様に、ネスト時は `ROLLBACK TO SAVEPOINT sp_N` に変換。

## 結果

- リロード後もサーバーからデータが正しく同期される（activities, logs, goals が全て取得可能）
- リポジトリの手動 `BEGIN`/`COMMIT` と `withTransactionAsync` が安全に共存
- ネイティブの expo-sqlite には影響なし（shim のみの変更）

## 備考

- ネイティブの `withTransactionAsync` が内部でどうやってリポジトリの手動 BEGIN/COMMIT と共存しているかは未調査。ネイティブでも同じ問題が起きる可能性がある場合、リポジトリ側のトランザクション管理を見直す必要があるかもしれない。
- 空 catch (`catch { }`) がエラーを握り潰していたのが発見を遅らせた。デバッグの基本手順（まず可視化）として、catch 内にログを入れるべきだった。
