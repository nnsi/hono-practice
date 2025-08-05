# コーディング規約

## TypeScript スタイルガイド

### 型定義
- **必ず `type` を使用** - `interface` は使わない
- 例: `type User = { id: string; name: string; }`

### ファクトリ関数パターン
- `newXXX` という名前のファクトリ関数で依存注入
- オブジェクトを返す形式で実装
- 例: `newUserRepository(db) => UserRepository`

### 関数の分割
- オブジェクトメソッドは個別の関数として定義
- ファクトリ関数内で組み立てる

### エラーハンドリング
- try-catchは使わず、`throw` で例外をスロー
- エラーハンドリングはRoute層またはグローバルミドルウェアで実施

## インポート順序（ESLintで強制）
1. React、Hono等のビルトインモジュール
2. 外部ライブラリ
3. 内部モジュール（@backend/*, @frontend/*, @dtos/*等）
4. 相対パス
- グループ間は空行で区切る
- 各グループ内はアルファベット順

## Biome/ESLint設定
- インデント: スペース2つ
- クォート: ダブルクォート
- 自動生成ファイル（*.gen.ts）は無視
- `no-explicit-any`, `no-non-null-assertion` 等は無効化

## フロントエンド設計方針
- **コンポーネント**: 純粋なプレゼンテーション層（ビジネスロジックなし）
- **カスタムフック**: すべてのロジックを集約
  - 状態管理、API通信、ビジネスロジック、イベントハンドラー
- **命名規則**:
  - 機能別フック: `use{Feature}Page` (例: `useDailyPage`)
  - アクションフック: `use{Action}` (例: `useLogin`)

## バックエンド設計方針
- クリーンアーキテクチャ（Route → Handler → Usecase → Repository）
- リポジトリメソッド名には必ずドメイン名を含める
  - 例: `createApiKey`, `findApiKeyById`（`create`, `findById` はNG）

## Git規約
- コミットメッセージ: 日本語で簡潔に
- 絵文字の使用可（例: 🚨, 🔨）
- メインブランチ: `master`