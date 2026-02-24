# オフライン同期機構（フロントエンド）コードレビュー（o3）

> 対象 PR/コミット: フロントエンド実装 `SyncQueue`, `SyncManager` 及び関連フック・UI
> レビュー担当: o3
> レビュー日: {{DATE}}

---

## 目次
1. 全体所感
2. 設計・責務の分離
3. 型安全性・実装細部
4. 運用・エッジケース
5. ユーザー体験
6. 追加で検討できる拡張
7. まとめ

---

## 1. 全体所感
- `SyncQueue` → `SyncManager` → React Hook/UI の 3 層構成は責務が明確で可読性が高い。
- `useSyncedMutation` によりオンライン/オフラインを透過化し、画面側の実装コストを低減している点が素晴らしい。

## 2. 設計・責務の分離
| 役割 | ファイル | コメント |
| --- | --- | --- |
| 永続キュー | `SyncQueue.ts` | ローカルストレージ永続化、FIFO 保証、リトライ回数管理 |
| 同期オーケストレーション | `SyncManager.ts` | バッチ同期、リスナー通知、AutoSync 管理 |
| React ラッパー | `useSyncedMutation.ts` 他 | React-Query と統合、楽観更新も許容 |

> ✅ 責務分割は適切。ディレクトリ構造も `services/sync` にまとまっており探索性が高い。

## 3. 型安全性・実装細部
### 3-1. NodeJS 型依存
```42:47:apps/frontend/src/services/sync/SyncManager.ts
private syncInterval: NodeJS.Timeout | null = null;
```
ブラウザ環境では `ReturnType<typeof setInterval>` を推奨。`@types/node` 依存を避けるとビルド互換性が向上します。

### 3-2. 失敗時ステータスの扱い
```107:121:apps/frontend/src/services/sync/SyncQueue.ts
item.status = "failed";
...
item.status = "pending"; // 即座に pending に戻す
```
「直近状態」と「累積失敗回数」を分離し、UI では `failed_pending_retry` など明確な状態を持たせると利用者への説明が容易になります。

### 3-3. sequenceCounter 復元
ローカルストレージに `sequenceCounter` が無い場合は `max(sequenceNumber)+1` を用いると重複防止になります。

### 3-4. syncPercentage の更新タイミング
同期開始前に `syncingCount` / `pendingCount` を更新 → `notifyListeners()` することでプログレスバーが滑らかに進行します。

### 3-5. `payload` 型
`any` を排除し `Record<string, unknown>` へ。間違った型の持ち込みを防止できます。

## 4. 運用・エッジケース
- **複数タブ対応**: `StorageEvent` で他タブ更新を検知し `loadFromStorage()` する。
- **永続キュー肥大化**: 圧縮 or 有効期限でパージを検討。
- **エクスポネンシャルバックオフ**: 連続 5xx/429 時にリトライ間隔を可変へ。
- **コンフリクト処理**: `conflict` 結果時の UI 対応を検討（ダイアログなど）。

## 5. ユーザー体験
- `OfflineBanner` と `SyncStatusIndicator` の組み合わせで状態が直感的に伝わる。
- 手動同期ボタン・プログレスバーあり。
- 楽観更新は◎ だが Rollback が未実装。サーバーエラー時の差分残留に注意。

## 6. 追加で検討できる拡張
1. **IndexedDB 移行**: 大容量データに強く UI ブロッキング回避。
2. **Service Worker の Background Sync API**: アプリ非起動時も同期可能。
3. **キュー重複排除**: 同一エンティティ更新をマージし帯域削減。
4. **コンフリクト戦略 UI**: `client-wins` / `server-wins` などをユーザー選択可能に。

## 7. まとめ
現状でも「理解しやすく動く」実装で高品質です。上記の型安全化・リトライ制御・マルチタブ対応を追加すれば、さらに堅牢でスケーラブルな同期基盤になります。 good job! 🚀 

---

## 追レビュー（{{DATE}}）
前回の指摘事項に対する修正を確認し、追加でレビューを行いました。

### 改善が確認できた点
| 前回指摘 | 改善内容 |
| --- | --- |
| `NodeJS.Timeout` 依存 | `ReturnType<typeof setInterval>` へ置換済み ✅ |
| 失敗ステータス分離 | `failed_pending_retry` を追加し UI/ロジックが明確化 ✅ |
| エクスポネンシャルバックオフ | `calculateRetryDelay` 実装で `BASE_RETRY_DELAY` & `MAX_RETRY_DELAY` を導入 ✅ |
| マルチタブ対応 | `storage` イベントリスナーで自動リロード ✅ |
| 暗号化 | `crypto.ts` 追加、ローカルストレージを AES-GCM で暗号化 ✅ |
| 型安全 & any 排除 | `payload: Record<string, unknown>` へ置換、一部 Hook も修正 ✅ |

### 追加で気になったポイント
1. **暗号鍵の導出ロジック**  
   - `userAgent` ベースの固定値はリバース出来てしまうためセキュリティ強度は限定的。少なくともユーザー ID やランダムシードを組み合わせるなど、推測困難な入力を推奨します。  
   - 将来的に Web Crypto の `generateKey` + IndexedDB 保存も検討ください。

2. **非同期初期化とレースコンディション**  
   ```43:50:apps/frontend/src/services/sync/SyncQueue.ts
   constructor() {
     this.queue = {};
     this.sequenceCounter = 0;
     // 非同期で初期化
     this.initialize();
   }
   ```  
   `initialize()` が完了する前に `enqueue` 等が呼ばれると整合性が崩れます。`initialize()` Promise を公開し、呼び出し側で await する方が安全です。

3. **`syncInterval` のクリア忘れ**  
   `NetworkStatusProvider` がアンマウントされるケースは少ないですが、アプリ全体を SPA から外に埋め込む場合などでリークの可能性があります。`cleanup()` を `unmount` 時に呼ぶ Hook を追加しておくと安心です。

4. **`SyncQueue` の `cleanup()` 未使用**  
   `SyncManager` が `SyncQueue` を生成する際、「タブ終了時に必ず `cleanup()` する」コードがまだ無いようです。`window.beforeunload` で呼ぶか、`SyncManager.stopAutoSync()` 内で `queue.cleanup()` を呼び出してください。

5. **Locking**  
   複数タブが同時に `dequeue`→`saveToStorage` すると競合の恐れがあります。簡易ミューテックスとして `localStorage.setItem('actiko-sync-lock', uuid, timestamp)` を使うか、`BroadcastChannel` + `navigator.locks` の利用を検討すると安全です。

6. **型の重複**  
   DTO がバックエンド側に存在する場合、`@dtos` 共有パッケージへ移動し、フロントエンド独自定義を排除すると保守性が向上します。

7. **キー容量の監視**  
   暗号化後はサイズが増大します。`localStorage` の 5MB 制限に近づいたら IndexedDB への移行を早める必要があります。定期的に `getTotalSize()` を計測し 4MB 超えで警告する仕組みがあると安心です。

### 全体評価
前回指摘した重要ポイントはほぼ解消され、実運用レベルでの堅牢性が大きく向上しました 🎉  
残タスクはセキュリティ強度（鍵導出）と多タブ競合対策が中心です。次フェーズでの改善候補としてご検討ください。 