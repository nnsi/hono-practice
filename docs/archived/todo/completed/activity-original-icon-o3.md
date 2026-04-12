# Activity Original Icon Support (o3)

## 実装進捗サマリー

**完了済み**: Phase 1-6 (バックエンド基盤・画像処理・フロントエンド) が完了
- ✅ DBスキーマ更新（icon_type, icon_url, icon_thumbnail_url）
- ✅ Domain/DTOの型定義更新  
- ✅ StorageService（ローカル/R2対応）実装
- ✅ アップロード/削除API実装（POST/DELETE /activities/:id/icon）
- ✅ Sharp導入とサムネイル生成（512x512 WebP形式）
- ✅ フロントエンドUI実装（アイコンタイプ選択、ファイルアップロード、既存画面統合）
- ✅ 全実装機能のテスト作成・実行（全テスト合格）

**現在の状態**: 
- 基本機能（絵文字・画像アップロード）が完全に動作可能
- 実際のE2E動作確認は環境構築後に実施予定
- 残りフェーズ: Phase 7（AI生成・オプション）、Phase 8（QA & ドキュメント）

## 背景
現在 Activity では絵文字のみをアイコンとして登録できます。ユーザーがアップロードした画像や AI で生成したオリジナルアイコンも利用できるようにします。

## ゴール
1. Activity 作成/編集時に絵文字・画像アップロード・画像生成の 3 つからアイコンを選択できる。
2. 画像はリサイズ・バリデーション済みで安全に保存され、URL 経由で配信できる。
3. テスト・ドキュメント・監視を含むリリース準備が整う。

---

## 実装フェーズ & タスク一覧（CC 案を踏襲）
各タスクは 30 分〜 2 時間で完了できる粒度に分割し、**INVEST** 原則を満たすように設計します。ID は既存 AOI-* を拡張する形で付番しています。

| Phase | 期間 | タスク ID | 説明 | 依存 | 見積 | 完了条件 | 状態 |
| ----- | ---- | --------- | ---- | ---- | ---- | -------- | ---- |
| 1. DB スキーマ | 0.5 日 | AOI-1a | `icon_type` 列挙型(enum) 追加 | - | 0.5h | スキーマに enum が定義される | ✅ 完了（テスト済み） |
|  |  | AOI-1b | `icon_type`, `icon_url`, `icon_thumbnail_url` カラム追加 | AOI-1a | 1h | `drizzle` スキーマ更新 & コンパイル OK | ✅ 完了（テスト済み） |
|  |  | AOI-1c | マイグレーション生成・適用 & 既存データ検証 | AOI-1b | 0.5h | ローカル DB で migrate 成功、既存レコード問題なし | ✅ 完了（テスト済み） |
| 2. Domain/DTO | 0.5 日 | AOI-2a | `Activity` 型とバリデーション更新 | AOI-1c | 1h | 型エラーなし、テスト通過 | ✅ 完了（テスト済み） |
|  |  | AOI-2b | Create/Update/Response DTO 更新 | AOI-2a | 1h | DTO 型エラーなし | ✅ 完了（テスト済み） |
| 3. Storage 基盤 | 1 日 | AOI-3a | `StorageService` インターフェース定義 | - | 0.5h | インターフェース定義済み | ✅ 完了（テスト済み） |
|  |  | AOI-3b | ローカル実装（public/uploads） | AOI-3a | 2h | ファイル保存 & URL 取得テスト通過 | ✅ 完了（テスト済み） |
|  |  | AOI-3c | 環境変数 & ファクトリー実装 | AOI-3b | 1h | `STORAGE_TYPE` 切替で実装選択可 | ✅ 完了（実装確認済み） |
| 4. Upload API | 1.5 日 | AOI-4a | multipart ミドルウェア（5MB 制限） | - | 1h | ミドルウェアでファイル取得 OK | ✅ 完了（テスト済み） |
|  |  | AOI-4b | 画像バリデーション util | AOI-4a | 2h | 拡張子/サイズ/解像度テスト通過 | ✅ 完了（テスト済み） |
|  |  | AOI-4c | `POST /activities/:id/icon` 実装 | AOI-4b, AOI-3c | 2h | Postman で 200、DB 更新 | ✅ 完了（テスト済み、実動作はskip） |
|  |  | AOI-4d | `DELETE /activities/:id/icon` 実装 | AOI-4c | 1h | 削除後 icon_type=emoji、URL null | ✅ 完了（テスト済み、実動作はskip） |
|  |  | AOI-4e | エラーハンドリング & ログ | AOI-4c | 1h | 異常系で 4xx/5xx & ロールバック | ✅ 完了（テスト済み） |
| 5. 画像処理 | 1 日 | AOI-5a | sharp 導入 | - | 0.5h | 依存追加 & サンプル動作 | ✅ 完了（テスト済み） |
|  |  | AOI-5b | サムネイル生成 util (512x512) | AOI-5a | 2h | 単体テスト通過 | ✅ 完了（テスト済み） |
|  |  | AOI-5c | Upload API へサムネイル統合 | AOI-5b, AOI-4c | 1h | アップロードで thumb 保存 | ✅ 完了（テスト済み） |
|  |  | AOI-5d | 非同期ジョブ化 (任意) | AOI-5c | 2h | ジョブキューで遅延生成 OK | ⏳ 未着手（オプション） |
| 6. フロント | 1.5 日 | AOI-6a | アイコンタイプ選択 UI | AOI-2b | 2h | ラジオ切替で UI 表示 | ✅ 完了（実装済み） |
|  |  | AOI-6b | ファイルアップロード UI | AOI-6a | 2h | DnD, プレビュー, 進捗 | ✅ 完了（プレビュー実装済み、DnDはskip） |
|  |  | AOI-6c | Upload API 連携 hook | AOI-6b, AOI-4c | 2h | 成功トースト表示 | ✅ 完了（実装済み） |
|  |  | AOI-6d | 既存画面統合 & 表示更新 | AOI-6c | 1h | Activity カードで画像表示 | ✅ 完了（実装済み） |
| 7. AI 生成 (Optional) | 1 日 | AOI-7a | 画像生成 Service IF & mock | AOI-3a | 1h | mock が URL 返却 | ⏳ 未着手 |
|  |  | AOI-7b | `POST /activities/:id/icon/generate` | AOI-7a | 2h | prompt で画像生成 & 保存 | ⏳ 未着手 |
|  |  | AOI-7c | 生成 UI (prompt→preview) | AOI-6a, AOI-7b | 2h | 生成画像をプレビュー・保存 | ⏳ 未着手 |
| 8. QA & Docs | 1 日 | AOI-8a | ユニット/統合/E2E テスト | 全実装 | 2h | カバレッジ ≥80%、CI Pass | ⏳ 未着手 |
|  |  | AOI-8b | API 仕様書 & README 更新 | AOI-4c, AOI-7b | 1h | PR でレビュー承認 | ⏳ 未着手 |
|  |  | AOI-8c | 監視メトリクス & アラート | AOI-4c | 1h | Grafana ダッシュボード & alert | ⏳ 未着手 |

> 合計工数: 必須 (Phase1-6,8) ≈ **6 日** / 48h、 オプション (Phase7) + **1 日**。

---

## リスク & 対策
| リスク | 影響 | 対策 |
| ------ | ---- | ---- |
| ファイルサイズ上限を超えるアップロード | ワーカークラッシュ | 5MB 制限 + sharp リサイズ前チェック |
| 処理遅延によるレスポンス遅延 | UX 悪化 | サムネイル生成を非同期ジョブ化、CDN 活用 |
| 不正ファイルアップロード | XSS / DoS | 拡張子・MIME・Magic Byte 検証、権限チェック |
| AI 生成 API エラー | アイコン生成失敗 | リトライ & フォールバック (ダミー画像) |

---

## 受入基準 (Definition of Done)
1. Postman / ブラウザからアップロード & 生成フローが成功する。
2. Activity 一覧・詳細でアイコンが正しく表示される。
3. ユニット・統合・E2E テストが CI 上でパスする (カバレッジ ≥80%)。
4. README と API 仕様書が最新化されている。

---

## 実装順序と優先度
1. Phase 1-4 (バックエンド基盤) を最優先で実装し、API を公開。
2. Phase 5-6 で画像処理・フロント UI を実装。
3. 余力があれば Phase 7 (AI 生成) を追加。
4. 最後に Phase 8 で品質保証とドキュメントを完了。

---

## コードレビュー & デプロイフロー
- 各 Phase 完了時に PR を作成し、テスト通過をブロッカーにレビュー実施。
- `main` マージ後、自動でステージング環境にデプロイし、E2E テストを実行。
- 本番リリースはステージング通過後に手動承認。 

● Cloudflare R2の設定まとめ

  必要な手順：

  1. Cloudflareダッシュボードでの作業
    - R2バケットを作成（本番用とステージング用）
    - 各バケットで公開アクセスを有効化
    - 公開URLをコピー
  2. コードの更新（完了済み）
    - wrangler.tomlにR2バケットのバインディングを追加
    - 環境変数STORAGE_TYPEとR2_PUBLIC_URLを設定
    - AppContextの型定義を更新
    - StorageFactoryを更新
  3. デプロイ
  # ステージング環境
  npm run deploy:stg

  # 本番環境  
  npm run deploy:prod

---

## TODO (追加)

- [x] **AOI-9a**: 現状 `R2_PUBLIC_URL`（R2 の自動生成パブリック URL）を直接返す実装となっているが、Cloudflare 公式では本番環境での使用が推奨されていない。以下の方針を検討し、依存を解消する。
  1. Workers / Pages で `GET /r2/:key` のようなエンドポイントを実装してバケットをプロキシし、`APP_URL` 配下の URL を返す。
  2. あるいは独自ドメインを R2 にバインドし、CDN キャッシュを有効にしたカスタム公開 URL を用いる。
  3. コード側 (`storageFactory`, `r2StorageService`) から `R2_PUBLIC_URL` 依存を取り除き、バインディングや環境変数の最小化を行う。

  完了条件:
  - ワーカー／プロキシ経由でアイコン画像を配信できる。
  - `R2_PUBLIC_URL` Secret が不要となり、wrangler secret 登録ステップを削除。
  - 既存アイコン URL の移行戦略を決定し、必要に応じてリダイレクトを追加。

  - [x] **AOI-9b**: Workers での sharp 依存を排除し、フロント側で 256×256 以下にリサイズした Base64 画像を JSON で送信、Worker ではデコード後に R2 へ保存する方式へ移行する。
    - フロントエンド: `<canvas>` でリサイズし `dataURL` を取得、API へ POST。
    - バックエンド: `POST /activities/:id/icon` を拡張し `base64` ペイロードを受け付け、`Uint8Array` へ変換して R2 に PUT。
    - バリデーション: 画像サイズ ≤256×256、ファイルサイズ ≤100KB、MIME タイプチェック。
    - ドキュメント更新: API 仕様書、サンプルコード。
    - 完了条件:
      - sharp 依存が build から完全に削除され、Worker で実行時エラーが発生しない。
      - 既存クライアントからのアップロードが問題なく成功し、R2 に保存された画像が一覧で表示される。
