# Refresh Token の状態モデル (rotatedAt × revokedAt)

## ステータス

決定

## コンテキスト

`refresh_tokens` テーブルは 2026-05-14 の rotation 改善で `rotated_at` カラムを追加した。これにより、状態を表す nullable timestamp カラムが 3 つ存在することになる:

- `rotated_at` — rotation を 1 回経由したことを記録 (grace 期間判定に使用)
- `revoked_at` — 「以後どのような形でも使わない」hard revoke
- `deleted_at` — 物理削除前の soft delete (expiry sweep 等)

これらの組み合わせ状態と、各状態における操作の許容可否を明示的に決めておかないと、次に refresh token 周辺を触る人 (or 半年後の自分) が必ず迷う。本 ADR で固定化する。

## 決定事項

### 状態マトリクス (deletedAt は別軸として常に hard fail)

| `rotatedAt` | `revokedAt` | 状態名 | rotation (POST /auth/token) | logout (POST /auth/logout) |
|---|---|---|---|---|
| null | null | **新規発行・通常** | ○ 初回 rotation 成功 (rotatedAt を CAS で刻む) | ○ 通常通り revoke |
| **set** | null | **rotation 済み・grace 内** | ○ grace 内なら 1 回限り救済発行 (同時に revokedAt を hard set) | × `getRefreshTokenByToken` で隠す → 401 |
| set | **set** | **grace 消費済 / hard revoked** | × 401 | × 401 |
| null | set | **明示的 logout 後** | × 401 | × 401 (再 logout) |

### 不変条件

1. **1 旧 token → 最大 1 救済**: 同じ旧 token に対する rotation は「初回成功」+「grace 内 1 回救済」= 最大 2 回まで。grace 救済時は同時に旧 row を hard revoke するため、3 回目以降は revokedAt で弾かれる。
2. **logout は rotated token を引かない**: `getRefreshTokenByToken` の filter で rotation 済み token は「無効化済み」として扱う。これにより、盗まれた旧 token で `/logout` を打つだけで被害者の grace 救済経路を妨害する攻撃を塞ぐ。
3. **明示 revoke は grace 対象外**: `revokeRefreshToken` (logout / account delete から呼ばれる) は `revokedAt` を立て、grace 救済の対象外にする。

### grace 窓の長さ

`REFRESH_TOKEN_ROTATION_GRACE_MS = 30_000` (30 秒)。

- 短すぎると lost-response 救済として機能しない (mobile の slow network で取りこぼし後の retry まで届かない可能性)
- 長すぎると stolen-token replay window が広がる
- モバイル通信再開 + 1 retry のラウンドトリップを賄える上限として 30 秒を選定

### 関数の責務分離

| 関数 | 役割 | rotatedAt の扱い |
|---|---|---|
| `getRefreshTokenByToken` | logout / 汎用 lookup | filter (rotated は隠す) |
| `revokeAndGetRefreshToken` | rotation 専用 | rotatedAt を読み書き、grace 判定 |
| `revokeRefreshToken` | 明示的 revoke (logout) | rotatedAt は触らず revokedAt を立てる |

## 結果

- refresh token 周辺の state machine が 4 状態 (deletedAt を含めれば 8) に明示化され、新規操作を足すときの判断基準が明確になった。
- 「ハッシュ不一致で正規 token を破壊する順序バグ」「lost-response race で強制ログアウト」「クロスタブ race で片方ログアウト」は全て解消。攻撃面 (selector-only DoS、grace 内無限発行、logout-via-rotated 妨害) も塞いだ。
- grace 30 秒は ユーザー UX とのトレードオフで、将来 Web Locks API 等でクロスタブ race を別経路で塞ぐなら短縮 / 撤廃も検討可能。

## 備考

- 関連実装: `apps/backend/feature/auth/refreshTokenRotation.ts`, `apps/backend/feature/auth/refreshTokenRepository.ts`
- 関連 migration: `infra/drizzle/migrations/0040_refresh_token_rotated_at.sql`
- 関連 PR: #219
- 既存 token は migration 後も `rotated_at = NULL` で「新規発行・通常」状態として扱われる (forward compatible)
