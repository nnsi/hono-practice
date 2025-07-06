# モバイルアプリの構造について

## 概要

ActikoのモバイルアプリはReact Native + Expoで開発されており、WebアプリケーションのコードベースからUIコンポーネントとビジネスロジックを移植しています。
Expo Routerによるファイルベースルーティングを採用し、Web版と同様の開発体験を提供しています。

## 技術スタック

### コアフレームワーク
- **React Native**: クロスプラットフォームモバイル開発
- **Expo SDK 51**: 開発ツールとランタイム
- **Expo Router**: ファイルベースルーティング
- **TypeScript**: 型安全な開発

### 状態管理・データフェッチ
- **Tanstack Query**: サーバー状態管理
- **React Context**: ローカル状態管理
- **Expo Secure Store**: 機密データの安全な保存

### UI・スタイリング
- **React Native Elements**: UIコンポーネントライブラリ
- **React Native Vector Icons**: アイコンライブラリ
- **StyleSheet API**: スタイリング

### 開発ツール
- **Expo Dev Client**: カスタム開発クライアント
- **EAS Build**: クラウドビルドサービス
- **Biome**: リンター・フォーマッター

## ディレクトリ構造

```txt
apps/mobile/
├── app/                    # ルーティング定義（Expo Router）
│   ├── (auth)/            # 認証必須画面
│   │   ├── _layout.tsx    # 認証レイアウト
│   │   ├── activity/      # 活動関連画面
│   │   ├── goals/         # 目標設定画面
│   │   ├── settings.tsx   # 設定画面
│   │   ├── tasks.tsx      # タスク一覧画面
│   │   └── today.tsx      # 今日の活動記録画面
│   ├── _layout.tsx        # ルートレイアウト
│   ├── index.tsx          # エントリーポイント
│   ├── login.tsx          # ログイン画面
│   └── register.tsx       # ユーザー登録画面
├── components/            # UIコンポーネント
│   ├── activity/         # 活動記録関連
│   ├── common/           # 共通コンポーネント
│   ├── goal/             # 目標設定関連
│   └── task/             # タスク管理関連
├── hooks/                # カスタムフック
├── services/             # APIクライアント・サービス
├── utils/                # ユーティリティ関数
├── constants/            # 定数定義
├── app.json             # Expoアプリ設定
├── expo-env.d.ts        # Expo型定義
└── package.json         # 依存関係管理
```

## 主要機能の実装

### 1. 認証機能

#### トークン管理
- アクセストークン: メモリ内管理（AuthContext）
- リフレッシュトークン: Expo Secure Storeで安全に保存
- アプリ起動時の自動認証チェック

#### Google OAuth認証
- `expo-auth-session`を使用したOAuth実装
- WebブラウザでのGoogle認証フロー
- 認証後のディープリンク処理

### 2. オフライン対応

#### ローカルストレージ
- AsyncStorageによるデータ永続化
- Tanstack Queryのキャッシュ永続化
- オフライン時の操作キューイング

#### ネットワーク監視
- NetInfoによるネットワーク状態監視
- オンライン復帰時の自動同期
- 同期状態のUI表示

### 3. プラットフォーム固有機能

#### iOS/Android対応
- プラットフォーム別のUIコンポーネント
- ネイティブAPIの活用（カメラ、通知など）
- プラットフォーム固有のスタイリング

#### パフォーマンス最適化
- FlatListによる大量データの効率的表示
- 画像の遅延読み込み
- メモリ使用量の最適化

## Web版との共通化

### 共有コード
- `packages/types`: 型定義・DTOの共有
- `packages/frontend-shared`: ユーティリティ関数の共有
- ビジネスロジック（hooks）の共通化

### 差分管理
- UIコンポーネント: プラットフォーム別に実装
- ルーティング: Expo Router用に調整
- ストレージ: AsyncStorage/SecureStoreを使用

## ナビゲーション構造

### Tab Navigation
```
┌─────────────────────────────────┐
│          Today                  │  <- デフォルト画面
├─────────────────────────────────┤
│  Today │ Tasks │ Stats │ More  │  <- タブバー
└─────────────────────────────────┘
```

### Stack Navigation
- 各タブ内でスタックナビゲーション
- モーダル表示（新規作成、編集など）
- 戻るボタンの適切な処理

## セキュリティ考慮事項

### データ保護
- Expo Secure Storeによる機密情報の暗号化
- HTTPSによる通信の暗号化
- 生体認証によるアプリロック（検討中）

### 権限管理
- 必要最小限の権限要求
- 権限要求時の適切な説明表示
- 権限拒否時の代替フロー

## ビルド・デプロイ

### 開発ビルド
```bash
# 開発サーバー起動
npm run mobile-dev

# iOS開発ビルド
eas build --platform ios --profile development

# Android開発ビルド
eas build --platform android --profile development
```

### 本番ビルド
```bash
# iOS本番ビルド
eas build --platform ios --profile production

# Android本番ビルド
eas build --platform android --profile production
```

### アプリストア申請
- **iOS**: App Store Connect経由
- **Android**: Google Play Console経由
- EAS Submitによる自動申請も可能

## テスト戦略

### ユニットテスト
- Jestによるコンポーネントテスト
- React Native Testing Library
- カスタムフックのテスト

### E2Eテスト
- Maestroによる自動化テスト
- 主要フローのテストシナリオ
- クロスプラットフォームテスト

## パフォーマンス監視

### Sentryの活用
- クラッシュレポート
- パフォーマンス監視
- ユーザーセッション追跡

### アプリサイズ最適化
- 不要な依存関係の削除
- アセットの最適化
- コード分割（検討中）

## 今後の計画

### 機能拡張
- プッシュ通知
- ウィジェット対応
- Apple Watch / Wear OS対応

### UX改善
- ダークモード対応
- アニメーション強化
- ジェスチャー操作の充実

### 技術的改善
- React Native New Architecture対応
- Hermes エンジン最適化
- バンドルサイズの削減