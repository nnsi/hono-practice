# WebフロントエンドとMobile版のコード共通化タスクリスト

## 📋 実施概要
WebフロントエンドとMobile版で重複しているコードを `packages/frontend-shared` に共通化し、保守性と開発効率を向上させる。

## 1. 高優先度タスク

### 1.1 AppSettings型の統一
- [x] `packages/frontend-shared/types/settings.ts` を作成
- [x] Mobile版の `AppSettings` 型定義を移動
- [x] Web版の既存の再エクスポートを確認
- [x] 両プラットフォームからの import を更新
  - [x] `apps/frontend/src/types/settings.ts` を更新
  - [x] `apps/mobile/src/types/settings.ts` を更新
- [x] Mobile版の `useAppSettings` フックを確認・更新
- [x] テストを実行して動作確認

### 1.2 時間ユーティリティ関数の共通化
- [x] `packages/frontend-shared/utils/timeUtils.ts` を作成
- [x] Web版から以下の関数を移動
  - [x] `isTimeUnit()` - 時間単位の判定
  - [x] `getTimeUnitType()` - 時間単位種別の取得  
  - [x] `convertSecondsToUnit()` - 秒数変換
  - [x] `generateTimeMemo()` - 時刻メモ生成
  - [x] `TimeUnitType` 型定義
- [x] Web版の import パスを更新
- [x] Mobile版で使用可能か確認（将来の利用に備えて）
- [x] ユニットテストを移動・更新
  - [x] `apps/frontend/src/utils/test/timeUtils.test.ts` を移動
- [x] テストを実行して動作確認

## 2. 中優先度タスク

### 2.1 定数・設定値の共通化
- [x] `packages/frontend-shared/utils/constants.ts` を作成
- [x] 共通定数を抽出・移動
  - [x] バリデーション制限値
    - [x] `MAX_QUANTITY = 99999`
    - [x] `MIN_QUANTITY = 0`
  - [x] エラーメッセージ定数
  - [x] デフォルト値（絵文字、単位など）
- [x] Web版の定数参照を更新
- [x] Mobile版の定数参照を更新（該当箇所があれば）
- [x] テストを実行して動作確認

### 2.2 バリデーションロジックの共通化
- [x] `packages/frontend-shared/utils/validation.ts` を作成
- [x] 汎用的なバリデーション関数を抽出
  - [x] `validateDate()` - 日付バリデーション
  - [x] `validateQuantity()` - 数量バリデーション
  - [x] `validateActivityName()` - アクティビティ名バリデーション
  - [x] `validateMemo()` - メモバリデーション（文字数制限など）
- [x] バリデーションエラー型を定義
  ```typescript
  type ValidationError = {
    field: string;
    message: string;
  }
  ```
- [x] Web版のCSVインポートバリデーションを更新
  - [x] `useActivityLogValidator.ts` を共通関数を使用するよう更新
- [x] Mobile版で将来使用できるように準備
- [x] ユニットテストを作成
- [x] テストを実行して動作確認

## 3. 低優先度タスク

### 3.1 API URL生成ロジックの共通化
- [x] `packages/frontend-shared/utils/apiUrl.ts` を作成
- [x] プラットフォーム別のURL生成関数を実装
  ```typescript
  export function getApiUrl(platform: 'web' | 'mobile', env?: any): string
  ```
- [x] Web版の API URL 生成ロジックを統合
  - [x] `apps/frontend/src/utils/apiClient.ts` を更新
- [x] Mobile版の API URL 生成ロジックを統合
  - [x] `apps/mobile/src/utils/getApiUrl.ts` を更新
  - [x] `apps/mobile/src/utils/apiClient.ts` を更新
- [x] 環境変数の取得方法を抽象化
- [x] テストを実行して動作確認

### 3.2 画像アップロード処理の共通化
- [x] `packages/frontend-shared/hooks/useActivityIcon.ts` を作成
- [x] 共通インターフェースを定義
  ```typescript
  interface ImageResizer {
    resizeImage(input: any, maxWidth: number, maxHeight: number): Promise<{ base64: string; mimeType: string }>
  }
  ```
- [x] `useUploadActivityIcon` フックを共通化
  - [x] プラットフォーム固有のリサイザーを注入可能にする
- [x] `useDeleteActivityIcon` フックを共通化
- [x] Web版の実装を更新
  - [x] `apps/frontend/src/hooks/api/useActivities.ts` を更新
- [x] Mobile版の実装を更新
  - [x] 該当箇所を特定して更新
- [x] テストを作成
- [x] 両プラットフォームで動作確認

## 4. テストと品質保証

### 4.1 全体テスト
- [x] Web版のテストスイートを実行
  ```bash
  npm run test-once
  ```
- [x] TypeScriptのコンパイルチェック
  ```bash
  npm run tsc
  ```
- [x] Lintチェック
  ```bash
  npm run fix
  ```
- [x] Mobile版のビルド確認
- [x] 両プラットフォームでの手動動作確認
  - [x] アクティビティ登録
  - [x] 時間表示
  - [x] バリデーション動作
  - [x] 画像アップロード（該当機能がある場合）

### 4.2 ドキュメント更新
- [x] 共通化したモジュールのREADMEを作成
- [x] 移行ガイドを作成（今後の開発者向け）
- [x] CLAUDE.mdに共通化の方針を追記

## 5. リファクタリング完了後のクリーンアップ

- [x] 不要になった重複コードを削除
- [x] import パスの整理
- [x] 未使用のファイルを削除
- [x] コミットメッセージの作成

## 📊 期待される成果

- コード重複の削減: 約15-20%
- 保守工数の削減: 約30%
- バグ修正箇所の一元化
- 新機能開発の効率化

## ⚠️ 注意事項

- 各タスク完了後は必ずテストを実行する
- プラットフォーム固有の処理は共通化しない
- 既存の動作を変更しないよう注意する
- コミットは機能単位で細かく行う