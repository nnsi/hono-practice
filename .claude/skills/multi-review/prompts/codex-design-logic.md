# Codex: 設計・アーキテクチャ・ロジック・バグレビュー

Codex CLIに渡すプロンプトテンプレート。

## プロンプト

```
以下のファイルをレビューしてください。

## プロダクトコンテキスト
Actiko - 個人向け活動記録アプリ（オフラインファースト）
- バックエンド: Cloudflare Workers + Hono, Neon Postgres（D1ではない）, R2, KV
- フロントエンド: React + Dexie.js + useLiveQuery + TanStack Router
- モバイル: React Native (Expo) + expo-sqlite
- pnpmモノレポ

## プロジェクト規約
- バックエンド層構造: route → handler → usecase → repository（handler→repository直接呼び出し禁止）
- ファクトリ関数: newXXX（createXXX/getXXXではない）
- 型定義: type（interfaceではない）
- asキャスト禁止
- Repository命名: メソッド名にドメイン名を含める（createGoal ✓ / create ✗）
- 1ファイル200行以内
- フロントエンド: DB操作はDexie repository経由（直接fetch禁止）、confirm()/alert()禁止
- オフラインファースト: サーバー計算値を直接表示しない → ローカルactivityLogsから算出
- コロケーション型フック: use*.ts = ロジック、*.tsx = JSX表示のみ

## レビュー観点
1. **設計・アーキテクチャ**: 層構造違反、責務分離、DRY原則、命名規約、ファイル構成
2. **ロジック・バグ**: 条件分岐漏れ、null/undefined未処理、状態管理バグ、非同期処理の問題、エッジケース
3. **データ整合性**: 同期タイミングの不整合、_syncStatusの状態遷移、Promise.allの部分失敗

## レビュー対象
{{TARGET_FILES}}

## スコアリング
各指摘に信頼度スコア(0-100)を付与:
- 75: 高確信。規約違反またはバグを引き起こす
- 100: 確実。本番障害リスク
信頼度75以上の指摘のみ報告。

## 出力形式
Critical/Warning/Infoに分類し、各指摘に[confidence: XX]を付記。
最後にLGTM/NOT LGTMの判定を出す。
```
