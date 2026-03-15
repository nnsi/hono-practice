# モバイルアプリ（mobile）の構造について

## 概要

ActikoのモバイルアプリはReact Native + Expoで開発。
frontendと同じオフラインファースト設計を採用し、共有パッケージ（`@packages/domain`, `@packages/sync-engine`等）で80%以上のロジックを共有している。

## 技術スタック

### コアフレームワーク
- **React Native 0.81**: クロスプラットフォームモバイル開発（New Architecture有効）
- **Expo SDK 54**: 開発ツールとランタイム
- **Expo Router 6**: ファイルベースルーティング
- **TypeScript**: 型安全な開発

### 状態管理・データフェッチ
- **expo-sqlite**: ネイティブSQLite（iOS/Android）
- **sql.js**: Web用SQLite（WebAssembly、Metro resolveRequestで自動切替）
- **TanStack Query**: サーバー専用データ（APIキー、サブスクリプション等）
- **Expo Secure Store**: 機密データの安全な保存（トークン等）

### UI・スタイリング
- **NativeWind 4**: Tailwind CSSベースのスタイリング
- **Lucide React Native**: アイコンライブラリ
- **Victory**: チャートライブラリ

### 共有パッケージ
- `@packages/domain`: ドメインロジック
- `@packages/sync-engine`: 同期エンジン
- `@packages/platform`: プラットフォームアダプター
- `@packages/types`: API型定義

## ディレクトリ構造

```txt
apps/mobile/
├── app/                       # Expo Routerルーティング
│   ├── _layout.tsx           # ルートレイアウト
│   ├── (auth)/               # 認証画面群
│   │   ├── _layout.tsx
│   │   ├── login.tsx         # ログイン画面
│   │   └── create-user.tsx   # ユーザー登録画面
│   └── (tabs)/               # タブナビゲーション
│       ├── _layout.tsx
│       ├── index.tsx         # ホーム画面（Actiko）
│       ├── daily.tsx         # 日次記録画面
│       ├── stats.tsx         # 統計画面
│       ├── goals.tsx         # 目標管理画面
│       ├── tasks.tsx         # タスク管理画面
│       └── settings.tsx      # 設定画面
├── src/
│   ├── components/           # UIコンポーネント（frontendと同構成）
│   │   ├── actiko/          # 活動記録メイン
│   │   ├── common/          # 共通UI
│   │   ├── csv/             # CSVインポート/エクスポート
│   │   ├── daily/           # 日次記録
│   │   ├── goal/            # 目標管理
│   │   ├── root/            # ルートレベル
│   │   ├── setting/         # 設定
│   │   ├── stats/           # 統計
│   │   └── tasks/           # タスク管理
│   ├── db/                   # データベース
│   │   ├── database.ts      # expo-sqlite接続
│   │   ├── expo-sqlite-web-shim.ts  # Web用sql.jsシム
│   │   ├── migrations.ts    # SQLiteマイグレーション
│   │   ├── dbEvents.ts      # DBイベント管理
│   │   └── useLiveQuery.ts  # リアクティブクエリフック
│   ├── repositories/         # データアクセス層
│   │   ├── activityRepository.ts
│   │   ├── activityLogRepository.ts
│   │   ├── goalRepository.ts
│   │   └── taskRepository.ts
│   ├── hooks/                # カスタムフック
│   │   ├── useAuth.ts
│   │   ├── useActivities.ts
│   │   ├── useActivityKinds.ts
│   │   ├── useActivityLogs.ts
│   │   ├── useGoals.ts
│   │   ├── useGoalStats.ts
│   │   ├── useTasks.ts
│   │   ├── useTimer.ts
│   │   ├── useApiKeys.ts
│   │   ├── useSubscription.ts
│   │   └── useSyncEngine.ts
│   ├── sync/                 # 同期エンジン
│   └── utils/                # ユーティリティ（apiClient等）
├── metro.config.js           # Metro設定（expo-sqlite → Web shimリダイレクト）
├── app.json                  # Expo設定
└── package.json
```

## アーキテクチャ: オフラインファースト

frontendと同じオフラインファースト設計:

```
[ユーザー操作]
    ↓
[Repository] → expo-sqliteに書き込み
    ↓
[useLiveQuery] → UIにリアクティブ反映
    ↓
[syncEngine] → バックグラウンドでサーバー同期
```

### frontendとの違い
| 項目 | frontend | mobile |
|------|-------------|-----------|
| ローカルDB | Dexie.js (IndexedDB) | expo-sqlite (ネイティブSQLite) |
| リアクティブ読み取り | `useLiveQuery` (Dexie) | `useLiveQuery` (カスタム実装) |
| ルーティング | TanStack Router | Expo Router |
| スタイリング | Tailwind CSS | NativeWind |
| トークン保存 | httpOnly cookie | Expo Secure Store |
| Web対応 | ネイティブ | Metro resolveRequestでsql.jsにフォールバック |

### Web動作確認
- Claude Codeでの実装確認用にWeb（Expo Web）でも動作する
- `metro.config.js` で `expo-sqlite` を `expo-sqlite-web-shim.ts` にリダイレクト
- Web用shimはsql.js（WebAssembly SQLite）を使用
- 開発サーバーポート: **8081**（`expo start --web`）

## コンポーネント設計

frontendと同じ**コロケーション型フック**パターン:

```txt
components/daily/
├── DailyPage.tsx          # UI（React Native JSX）
├── useDailyPage.ts        # ロジック
├── EditLogDialog.tsx
└── index.ts
```

### React NativeとWebの違い
- UIコンポーネント: `<View>`, `<Text>`, `<TouchableOpacity>` 等
- イベント: `onPress`（`onClick`ではない）
- スタイリング: NativeWind `className` + StyleSheet

## ナビゲーション構造

Expo Routerによるファイルベースナビゲーション:

### 認証フロー
```
app/_layout.tsx → 認証状態チェック
  ├── (auth)/ → 未認証時
  │   ├── login.tsx
  │   └── create-user.tsx
  └── (tabs)/ → 認証済み
      ├── index.tsx (Actiko)
      ├── daily.tsx
      ├── stats.tsx
      ├── goals.tsx
      ├── tasks.tsx
      └── settings.tsx
```

## ビルド・デプロイ

```bash
# 開発サーバー起動
pnpm --filter actiko-mobile start

# Web開発
pnpm --filter actiko-mobile web

# iOS / Android
pnpm --filter actiko-mobile ios
pnpm --filter actiko-mobile android
```

### EASビルド（本番）
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

## セキュリティ
- **Expo Secure Store**: トークン等の機密情報を暗号化保存
- **HTTPS**: 全API通信を暗号化
- 認証フローはfrontendと共通（`@packages/platform`のアダプター経由）
