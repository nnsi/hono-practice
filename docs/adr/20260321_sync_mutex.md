# Sync Mutex: pull/push sync 間の排他制御

## ステータス

決定

## コンテキスト

iOS で "database is locked" (SQLITE_BUSY, error code 5) が発生していた（WAE クライアントエラーログで 4 件確認）。

原因調査の結果、以下の 3 つの並行パターンが特定された:

1. **`getDatabase()` のレースコンディション**: 複数の呼び出し元が同時に `openDatabaseAsync` を実行し、2 つの DB 接続が生成される
2. **`createNavigationSync` の `Promise.all([syncAll(), pullSync()])`**: push sync と pull sync が同時に DB へ書き込む
3. **`startAutoSync` と `triggerNavigationSync` の排他制御がない**: タブ切替で `triggerNavigationSync` が `pullSync` を実行中に、`startAutoSync` のタイマーや `onOnline` が `syncAll` を発火する

原因 1 は Promise キャッシュ、原因 2 は直列化で対処済み。しかし原因 3 は、pull sync と push sync が異なるコードパス（`useSyncEngine` と `useNavigationSync`）から独立して発火するため、個別の修正では防げなかった。

### 検討した選択肢

| 案 | 対象 | メリット | デメリット |
|----|------|---------|-----------|
| **A. sync mutex** | `syncAll` + `pullSync` に共通ロック | sync 内で完結。UI 操作に影響なし | UI 発の TXN（reorderActivities 等）と sync の並行は防げない |
| **B. DB write mutex** | `getDatabase()` の返り値をラップ | 全書き込み操作を完全にシリアライズ。最も安全 | UI 操作（Activity 作成・ログ記録等）の `runAsync` も全てキュー待ちになり体感レイテンシ増 |

WAE ログ上 "database is locked" が発生しているのは全て sync 絡みであり、UI 操作単体では発生していなかった。

## 決定事項

**案 A: sync レベルの mutex** を採用する。

- `createSyncMutex()` — Promise ベースの mutex。`isBusy()` と `run(fn)` を提供
- **スキップ方式**: ロック中に `run()` が呼ばれたら fn を実行せず `undefined` を返す（キューイングしない）。sync は定期的に再実行されるので、今回スキップしても次のタイミングで実行される
- `createSyncEngine` が mutex を保持し、`syncAll` 実行時にロックを取得
- `createNavigationSync` が同じ mutex を共有し、`pullSync` 実行時にもロックを取得
- mutex は `syncEngine.mutex` として外部に公開し、`createNavigationSync` の deps 経由で注入

### スキップを選んだ理由

- 待機（queue）にすると、タブ切替やオンライン復帰で複数の sync リクエストが溜まり、不要な連続実行が発生する
- sync はべき等（同じデータを何度送っても結果が同じ）なので、1 回分スキップしても問題ない
- 既存の `isSyncing` フラグも実質的にスキップ方式だったため、動作の一貫性が保たれる

## 結果

- `pullSync` 実行中に `syncAll` が発火 → スキップ（次回のタイマーや画面遷移で再実行）
- `syncAll` 実行中に `pullSync` が発火 → スキップ（次回の画面遷移で再実行）
- UI 操作（Activity 作成・ログ記録・並べ替え等）は mutex を通らないため影響なし
- テスト: `createSyncMutex`(6 件) + `createNavigationSync`(6 件) + `createSyncEngine` の mutex テスト(4 件) を追加

## 備考

- UI 操作と sync の並行による "database is locked" が将来発生した場合は、案 B（DB write mutex）への移行を検討する
- 各リポジトリの手動 `BEGIN`/`COMMIT`（9 箇所）を `withTransactionAsync` に統一する構造改善は別途検討の余地がある。ただし `initialSync.ts` のコメントにある通り、ネストトランザクションの問題があるため、mutex との併用を前提に設計する必要がある
- オンライン復帰時の `startAutoSync.onOnline` と `registerOnlineRetry` の同時発火は、mutex によりどちらか一方がスキップされるため、実質的に対処済みとなった
