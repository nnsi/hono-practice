# E2Eテスト基盤（PGlite + Hono + Vite + Playwright）

## ステータス

決定

## コンテキスト

既存のテストは全てモックベースのユニットテストで、実際の HTTP リクエストを伴う E2E テストが存在しなかった。フロントエンドからバックエンド、DB までを貫通するテストがないため、sync フローやログインフローの統合的な検証ができていなかった。

要件:
- Vitest でサーバーごと立ち上がる
- PGlite で完全インメモリ（外部 DB 不要）
- CI でもローカルでも同じ条件で実行可能

## 決定事項

### アーキテクチャ

```
globalSetup.ts
  ├─ PGlite (インメモリ PostgreSQL)
  ├─ Hono server (port 3457)
  └─ Vite dev server (port 5176, proxy: /api → 3457)

テストプロセス
  ├─ Playwright browser instance
  └─ Vitest テストランナー
```

### 主な設計判断

1. **PGlite によるインメモリ DB**: 外部 PostgreSQL に依存せず、テストごとにクリーンな状態から開始。`seedDevData(db)` を純粋関数として抽出し、PGlite / postgres-js / neon-http の全ドライバで再利用可能にした。

2. **Vite proxy で同一オリジン化**: フロントエンド(5176)とバックエンド(3457)がクロスオリジンになると、`SameSite=Lax`（Chromium デフォルト）で refresh_token Cookie が POST で送信されない。Vite の proxy 設定で `/api` → バックエンドにルーティングし、同一オリジンに統合。

3. **`VITE_API_URL` の設定**: `apiClient.ts` に `import.meta.env.VITE_API_URL || "http://localhost:3456"` というフォールバックがあるため、空文字を設定すると開発バックエンド(3456)に接続してしまう。`VITE_API_URL` を `http://localhost:5176`（Vite 自身の URL）に設定し、proxy 経由でバックエンドに到達させる。

4. **E2E ユーザーの決定論的シード**: `e2e@example.com` を固定シードデータとして追加。ランダム要素のある dev 用ユーザーとは分離。

## 結果

- auth(3件), activity(2件), task(1件) の E2E テストが動作
- ユニットテストと E2E テストが同じ `pnpm run test-once` で実行可能
- globalSetup / テストプロセスのライフサイクルが分離されており、テスト間の状態汚染がない

## 備考

- E2E テストのセレクタは推測で書かず、実 UI を確認するか Explore エージェントで調査してから書くこと。`aria-label` が存在しない要素に `button[aria-label="..."]` を書いて失敗するケースがあった。
- `has-text` セレクタはサブストリングマッチで親要素のテキストにも反応する。`type="submit"` 等の属性と組み合わせて限定すること。
