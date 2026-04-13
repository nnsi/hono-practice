# initial sync の Web / Mobile 差分整理

## ステータス

決定

## コンテキスト

`packages/sync-engine/pull/createInitialSync.ts` に共通ロジックを集約した後も、`apps/frontend/src/sync/initialSync.ts` と `apps/mobile/src/sync/initialSync.ts` にはプラットフォーム境界の差分が残っている。  
差分を「意図的な adapter 差分」と「 accidental なドリフト」に分けて固定しないと、片方だけ挙動が変わる。

## 決定事項

### 1. 残す差分

- `writeAllData`
  - Web は Dexie transaction で multi-store write を 1 単位で commit する
  - Mobile は各 repository が sqlite transaction を内部管理するため、外側で `withTransactionAsync` を張らない
  - これは実装差分であり、意味論の差分ではない

- `freezePeriods` fetch の `catch(() => null)`
  - 旧 backend との staged rollout 互換のため、Web / Mobile 両方で残す
  - `null` は「その resource が同期失敗した」扱いであり、`lastSyncedAt` は更新しない

### 2. 残さない差分

- `notes` fetch fallback の platform 差分
  - 以前は Mobile だけ `apiClient.users.v2.notes.$get(...).catch(() => null)` していた
  - sync core は `notesRes: null` を partial sync として扱えるため、2026-04-13 に Web も同じ fallback へ揃えた
  - `notes` fetch 失敗時は Web / Mobile ともに他 resource の hydrate は継続し、`lastSyncedAt` は更新しない

### 3. 今後のルール

- platform adapter の都合で差分が必要な場合は、この ADR に追記してから入れる
- fetch / parse / watermark 更新の意味論は Web / Mobile で揃える
- 新 resource 追加時の初回 full-pull は `bootstrappedResources` で解決し、platform 個別 fallback を増やさない

## 結果

- 現在の差分は「storage / DB adapter に由来するもの」だけになった
- `notes` のような partial-sync 許容 resource は Web / Mobile で同じ失敗ポリシーに揃った
- initial sync の platform 差分を確認する参照先が 1 つに固定された
