# Actiko オフライン対応 実装可能性レポート（ハイブリッド方式）

## エグゼクティブサマリー

現在のActikoウェブアプリケーションに**ハイブリッド型オフライン対応**を実装する。フロントエンドはWeb接続が必要だが、記録機能はオフラインでも利用可能とし、オンライン復帰時に自動同期する方式を採用。

**総開発工数見積: 2-3週間** （熟練開発者1名）
- フロントエンド: 2週間（中複雑度）
- バックエンド: 1週間（低複雑度）

**工数削減効果: 60-70%** （フルオフライン比較）

## 現状分析

### フロントエンド（React）現状

**技術スタック:**
- React Query v5 (データフェッチング・キャッシュ)
- @tanstack/react-query-persist-client (キャッシュ永続化)
- TanStack Router v1 (ルーティング)
- Context ベース状態管理
- Hono Client (型安全 API クライアント)
- メモリ内トークン管理

**ハイブリッド方式での課題:**
❌ **記録データの揮発性**: ページリフレッシュで未同期データ消失
❌ **ネットワーク断絶時の記録不可**: 一時的な接続断でデータロスト
✅ **認証システム**: 現行のメモリ内トークンで対応可能
✅ **UI/UX基盤**: 既存のReact Queryパターンをそのまま活用

### バックエンド（Hono + Drizzle）現状

**技術スタック:**
- RESTful API 設計
- JWT 認証 + リフレッシュトークン
- Drizzle ORM + トランザクション対応
- 基本的なバッチ API（読み取りのみ）

**ハイブリッド方式での対応状況:**
✅ **既存API活用**: 現行のCRUD APIをそのまま利用可能
✅ **認証システム**: 現行のJWT認証で対応可能
❌ **重複防止機能**: タイムスタンプベース重複チェック機能が必要
❌ **同期確認API**: オフラインデータの同期状況確認機能が必要

## ハイブリッド方式実装計画

### Week 1: 基盤実装（フロントエンド重点）

#### フロントエンド作業 (4-5日)
1. **ネットワーク状態検知** (1日)
   ```typescript
   // ネットワーク状態の監視とReact Context化
   const useNetworkStatus = () => navigator.onLine
   ```

2. **React Query Persist + ストレージ永続化** (1日)
   ```tsx
   import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
   import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

   const queryClient = new QueryClient({
     defaultOptions: {
       queries: { cacheTime: 1000 * 60 * 60 * 24 }, // 24h 保持
     },
   })

   const persister = createSyncStoragePersister({
     storage: window.localStorage,
   })

   // アプリのエントリポイント
   <PersistQueryClientProvider
     client={queryClient}
     persistOptions={{ persister }}
   >
     <App />
   </PersistQueryClientProvider>
   ```
   - TanStack Query の `resumePausedMutations()` で未同期ミューテーションを自動再送

3. **基本同期システム** (2日)
   - オンライン復帰時の自動同期
   - 重複送信防止ロジック

#### バックエンド作業 (2日)
1. **重複チェック API** (1日)
   ```typescript
   GET /sync/check-duplicates?timestamps=...
   ```

2. **同期状況確認 API** (1日)
   ```typescript
   GET /sync/status
   ```

### Week 2: 機能実装・UI強化

#### フロントエンド作業 (4-5日)
1. **オフライン記録UI改善** (2-3日)
   - 未同期データの視覚的表示
   - 同期ステータスインジケーター
   - エラーハンドリング強化

2. **ユーザー体験向上** (2日)
   - オフライン時の適切なメッセージ表示
   - 同期進捗の可視化
   - リトライ機能

#### バックエンド作業 (1日)
1. **API調整・最適化** (1日)
   - 同期効率化
   - エラーレスポンス改善

### Week 3: テスト・品質保証・ドキュメント

1. **エッジケース対応** (2日)
   - ネットワーク切断/復帰テスト
   - 大量データ同期テスト
   - エラー回復テスト

2. **パフォーマンス最適化** (2日)
   - localStorage容量管理
   - 同期効率改善
   - UI応答性向上

3. **ドキュメント整備** (1日)
   - ユーザーガイド
   - 開発者向けドキュメント

## 技術的課題と解決策（ハイブリッド方式）

### 主要課題

1. **データ永続性の確保**
   - **課題**: ページリフレッシュで未同期データが消失
   - **解決策**: React Query Persist + localStorage (または IndexedDB) によるキャッシュ永続化 + 起動時同期チェック

2. **重複データ防止**
   - **課題**: 同期時に同じデータが重複送信される可能性
   - **解決策**: タイムスタンプベース重複チェック + サーバーサイド検証

3. **ネットワーク状態の適切な処理**
   - **課題**: 断続的なネットワーク接続での動作安定性
   - **解決策**: リトライ機能付き同期システム + 状態管理

### 必要な新規依存関係

**フロントエンド:** 新規依存
- @tanstack/react-query-persist-client
- @tanstack/query-sync-storage-persister
- (任意) idb-keyval など IndexedDB ラッパー
  
既存 API (Navigator.onLine など) はそのまま利用

**バックエンド:** 既存依存関係で対応可能
- 新規エンドポイント追加のみ

## リスク評価（ハイブリッド方式）

### 低リスク要素
- **既存システム活用**: 認証・API構造をそのまま利用
- **シンプルな実装**: localStorage + 標準Web API のみ使用
- **段階的実装**: 小さな変更の積み重ねで実現

### 中リスク要素
- **データ一貫性**: 同期タイミングでの重複・競合
- **ユーザー体験**: オフライン時の適切なフィードバック
- **容量管理**: localStorage の制限とクリーンアップ

## ハイブリッド方式の利点・制約

### 利点
✅ **実装コスト低**: 既存システムへの影響最小
✅ **技術リスク低**: 枯れた技術のみ使用
✅ **デバッグ容易**: 複雑なService Workerを使用しない
✅ **段階的改善可能**: 後にフルオフライン化も可能

### 制約
❌ **初回接続必須**: Webアプリ読み込みにネット接続が必要
❌ **完全オフライン不可**: アプリライクな体験は提供できない
❌ **同期タイミング制限**: アプリ起動時・オンライン復帰時のみ

## 推奨実装戦略

### 段階的アプローチ
1. **最小機能実装**: 活動ログのオフライン記録から開始
2. **機能拡張**: タスク記録 → ゴール更新の順序で追加
3. **UX改善**: 状態表示・エラーハンドリングの強化

### 成功指標
- **記録断絶ゼロ**: ネットワーク切断で記録ができない状況を解消
- **同期成功率 > 95%**: オンライン復帰時の自動同期成功率
- **ユーザー満足度向上**: 「速度重視」体験の一貫性確保

## 結論

ハイブリッド方式により**2-3週間**で実装可能な現実的なオフライン対応を実現。フルオフライン対応の60-70%の工数削減を達成しながら、ユーザーの主要課題である「記録の断絶」を解決する。

**推奨実装**: UX向上とリリース前実装の観点から、ハイブリッド方式での早期実装を強く推奨。将来的なフルオフライン化への基盤としても価値がある。

実装により、Actikoの「最速記録」体験が**一時的なネットワーク断絶に耐性**を持ち、ユーザーの活動記録の継続性を保証できる。

## React Native / Expo 対応展望（将来計画）

### 互換性と追加作業

| 項目 | Web (現行) | React Native / Expo |
| --- | --- | --- |
| ネットワーク検知 | `navigator.onLine` + custom ping | `@react-native-community/netinfo` または `expo-network` |
| ストレージ | `localStorage` or IndexedDB | `AsyncStorage` / `react-native-mmkv` |
| React Query 永続化 | `createSyncStoragePersister` | `createAsyncStoragePersister` (`@tanstack/query-async-storage-persister`) |
| OTA更新 | なし | Expo `expo-updates` により JS バンドルをオフライン保存 |

TanStack Query の Persist 機能は React Native でも同じ API で利用可能であり、`createAsyncStoragePersister` が公式に提供されています[^tanstackPersistRN]。また、Expo SDK49 以降は `expo-router` と `expo-updates` がデフォルトでオフライン JS バンドルをキャッシュするため、「初回インストール後は機内モードでも UI 起動可」という要件を満たせます。

### 追加依存関係（React Native 導入時）

* `@react-native-async-storage/async-storage` (最小構成)
* `@tanstack/query-async-storage-persister`
* `@react-native-community/netinfo` または `expo-network`
* (任意) `react-native-mmkv` + 自作 Persister — 10–30 倍高速 & 暗号化オプション[^mmkv]

### 工数見積（RN 対応分）

| フェーズ | 追加工数 |
| --- | --- |
| ストレージ Persister 切替 & ネットワーク検知実装 | 1.5 日 |
| Expo OTA / Updates 設定 & テスト | 1 日 |
| iOS / Android QA（機内モード・電波断） | 2 日 |

合計 **約 4.5 人日** で Web 実装を再利用したモバイル版ハイブリッドオフライン機能の PoC が可能と見積もります。

### リスク要素

* **ストレージ容量**: AsyncStorage は ~6MB 制限（プラットフォーム依存）。大量データには MMKV や SQLite/Roam を検討。
* **バッテリー消費**: モバイルではバックグラウンド同期頻度を抑え、Expo `BackgroundFetch` または Push 通知トリガでの同期を検討。
* **アプリのサイズ増加**: MMKV/SQLite ネイティブコード追加で数 MB 増える。

[^tanstackPersistRN]: TanStack Query Persist 公式ドキュメントに React Native 用 `createAsyncStoragePersister` のサンプルあり。<https://tanstack.com/query/v4/docs/react/plugins/persistQueryClient>
[^mmkv]: MMKV は Tencent 製の高速 Key-Value ストレージ。React Native 実装: <https://github.com/mrousavy/react-native-mmkv>