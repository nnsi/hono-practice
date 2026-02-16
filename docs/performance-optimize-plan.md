# パフォーマンス最適化計画

WAE (Workers Analytics Engine) APMログ分析に基づく改善計画。

## 全体サマリー

| 指標 | 値 |
|------|-----|
| 有効リクエスト数 | 289件（OPTIONS除外） |
| 平均レスポンス時間 | **661ms** |
| DB操作平均 | 624ms（全体の **94%**） |
| KV操作平均 | 161ms（auth系のみ） |
| 5xxエラー | **0件** |

---

## 1. `POST /auth/token` — 最重要・最遅

| 指標 | 値 |
|------|-----|
| リクエスト数 | 67件 |
| 平均 | **1,626ms** |
| 最大 | 2,737ms |
| DB平均 | 904ms |
| KV平均 | 682ms |

### ボトルネック

- **KVレートリミッター: 2回の逐次KV操作** — `getRateLimit` → `setRateLimit` で計682ms。Cloudflare KVのレイテンシが高い（1回300ms超）
- **3回の逐次DBクエリ** — `getRefreshTokenByToken` → `createRefreshToken` → `revokeRefreshToken` が直列実行
- DB操作のうち、新トークン作成と旧トークン無効化は**並列化可能**

### 改善案

1. レートリミッターのKV操作を1回に統合（get+setを1回のset with条件チェックに）
2. `createRefreshToken` と `revokeRefreshToken` を `Promise.all` で並列化
3. トークンリフレッシュにはレートリミットを緩和 or KV不要の方式を検討

---

## 2. `GET /users/goals` — N+1クエリ問題

| 指標 | 値 |
|------|-----|
| リクエスト数 | 69件 |
| 平均 | **526ms** |
| DB合算平均 | **1,221ms**（並列実行のため合算 > duration） |
| スパン数 | 5〜11 |

### ボトルネック

- **N+1クエリ**: ゴール毎に `calculateCurrentBalance` と `getInactiveDates` で**2回ずつ同じDBクエリ**を実行
- ゴール5個 → DBクエリ11回（1 + 5×2）
- `getActivityLogsByUserIdAndDate()` が**同じデータを2回取得**している
- DB取得後、JavaScript側で `activityId` でフィルタ（DBでフィルタすべき）

### 改善案

1. activity-logsを**1回だけ一括取得**し、全ゴールで共有
2. `activityId` でのフィルタをDB側のWHERE句に移動
3. `calculateCurrentBalance` と `getInactiveDates` にログデータを引数として渡す

**期待改善: 11クエリ → 2クエリ、526ms → 100〜150ms程度**

---

## 3. `GET /user/me` — 逐次クエリ

| 指標 | 値 |
|------|-----|
| リクエスト数 | 17件 |
| 平均 | **374ms** |
| DB平均 | 374ms |
| スパン数 | 2 |

### ボトルネック

- `getUserById()` → `getUserProvidersByUserId()` が**直列実行**
- 2つの独立したクエリなので `Promise.all` で並列化可能

### 改善案

`Promise.all([getUserById, getUserProvidersByUserId])` に変更

**期待改善: 374ms → 200ms程度**

---

## 4. `POST /batch` — ミドルウェア重複実行

| 指標 | 値 |
|------|-----|
| リクエスト数 | 22件 |
| 平均 | **331ms** |

### ボトルネック

- バッチ内の各リクエストで `app.request()` を呼び出し、**認証・レートリミット等のミドルウェアがN回再実行**
- 認証トークン検証がバッチ内で繰り返される

### 改善案

バッチ内リクエストではミドルウェアをバイパスし、認証済みコンテキストを共有

---

## 5. `POST /users/activity-logs` — バッチ時のN+1

| 指標 | 値 |
|------|-----|
| リクエスト数 | 9件 |
| 平均 | **447ms** |
| DB平均 | 400ms |

### ボトルネック

- `createActivityLogBatch()` でログ毎に `getActivityByIdAndUserId()` を**forループで逐次実行**
- バッチ10件 → 10回の逐次DBクエリ

### 改善案

ユニークな `activityId` を集めて1回のクエリで一括取得し、Mapでルックアップ

---

## 6. `GET /users/activities` — 比較的良好

| 指標 | 値 |
|------|-----|
| リクエスト数 | 58件 |
| 平均 | **279ms** |
| DB平均 | 276ms |

単一クエリで特に問題なし。Hyperdrive経由のDB接続レイテンシが大半。

---

## 7. `GET /users/activity-logs/stats` — 許容範囲

| 指標 | 値 |
|------|-----|
| リクエスト数 | 29件 |
| 平均 | **214ms** |

重いJOINクエリだが、stats集計としては妥当。

---

## 横断的な改善ポイント

| 改善項目 | 影響範囲 | 期待効果 |
|----------|---------|---------|
| **Hyperdrive接続のウォームアップ** | 全エンドポイント | コールドスタート時のDB接続に100〜300msかかっている可能性。接続プール設定の見直し |
| **KVレイテンシ低減** | auth系 | Cloudflare KVの読み書きが300ms超。Workers KVの代わりにDurable Objects or キャッシュAPIの検討 |
| **DBクエリのactivityIdフィルタ** | goals, activity-logs | JSでのフィルタをSQLのWHEREに移動 |
| **ボットトラフィック** | ログ品質 | `.git/config`, `.env.live` 等へのスキャンボットが多数記録されている（273パス中260がボット） |

---

## 優先度順の改善ロードマップ

1. **`GET /users/goals` のN+1解消** — 最大インパクト（69件×526ms → 150ms推定）
2. **`POST /auth/token` のKV+DB最適化** — ユーザー体感に直結（67件×1626ms → 600ms推定）
3. **`GET /user/me` の並列化** — 簡単な修正で効果大
4. **`POST /users/activity-logs` バッチの一括取得** — バッチ利用頻度次第
5. **`POST /batch` のミドルウェア最適化** — 中期的な改善
