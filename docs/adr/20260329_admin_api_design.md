# 管理API設計（/admin/ プレフィックス）

## ステータス: Accepted

## コンテキスト

管理画面用のAPIエンドポイントを設計する。既存のユーザー向けAPI（/users/*, /auth/*）とは明確に分離する必要がある。

## 決定事項

### 1. エンドポイント設計

```
POST   /admin/auth/google     管理者Googleログイン
GET    /admin/dashboard        ダッシュボードデータ（集計）
GET    /admin/users            ユーザー一覧
GET    /admin/contacts         問い合わせ一覧
GET    /admin/contacts/:id     問い合わせ詳細
```

### 2. 認証ミドルウェア

- `/admin/auth/*` 以外の全 `/admin/*` パスに `adminAuthMiddleware` を適用
- adminAuthMiddlewareは管理者JWT（role: "admin"）を検証

### 3. レスポンス形式

- ユーザー一覧: ページネーション対応（limit/offset）
- 問い合わせ一覧: ページネーション対応
- ダッシュボード: ユーザー総数、直近のアクション件数、問い合わせ件数

### 4. 層構造

既存のバックエンドパターンに従う:
```
adminRoute → adminHandler → adminUsecase → adminRepository
```

ただし、管理画面のMVPとして、handler層はスキップしてroute内で直接usecase/repositoryを呼ぶ。
理由: 管理画面のAPIは薄いCRUDが中心で、handlerの抽象化メリットが少ない。

### 5. バッチリクエスト

- `/batch` エンドポイントは `/users/` パスのみ許可する既存制約があるため、admin APIはバッチ対象外
- 管理画面はリクエスト数が少ないため問題なし

## 影響

- app.tsに `.route("/admin", adminRoute)` を追加
- configSchemaに `ADMIN_ALLOWED_EMAILS` を追加
- CORSオリジンにadmin-frontendのURLを追加
