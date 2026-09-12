---
name: wae-apm
description: stg / production の API・client error を Cloudflare Analytics Engine で調査する。
---

# WAE APM

対象環境・期間・調査したい現象を決める。SQL API 実行前にルート AGENTS.md の課金条件を確認する。

- API logs: `actiko_api_logs`。定義は `apps/tail-worker/src/index.ts` と `apps/backend/middleware/waeWriter.ts`。
- Client errors: `actiko_client_errors`。定義は `apps/backend/feature/clientError/clientErrorUsecase.ts`、集計例は `apps/backend/feature/admin/waeClientErrorQuery.ts`。
- account / dataset は実際の設定と認証済み環境から解決する。トークンの設定ファイルを全文表示しない。秘密値をコマンド文字列やレポートへ埋め込まない。

SQL API `/client/v4/accounts/<account-id>/analytics_engine/sql` を使い、期間と件数を絞って取得する。列の意味・単位・環境の識別方法は書き込み元で確認する。集計ではサンプリング重みを確認し、生の行数をリクエスト総数と断定しない。

遅い endpoint、5xx、DB / R2 / KV / 外部 API の時間、client error を現象に合わせて調べる。コードと照合し、観測値・推測・調査対象外を区別して報告する。
