# 認証更新中の終了・再読み込みからの復旧

## 原因と受け入れ条件

2026-09-12 23:04–23:07 JST の本番診断で、Firefox の reload と iOS の終了・再起動時に、サーバーで rotation が commit されてもクライアントが応答を使用できないケースを確認した。
iOS は 23:06:20 に commit / 200、23:07:06 に 47,899 ms の timeout、直後の再試行が `grace_expired` 401。その結果 SecureStore の認証情報が削除された。
DB transaction の rollback や短い grace だけでは、commit と応答受領・永続保存の間の中断を復旧できない。

- commit 後に応答を二度失っても、再起動・reload で認証を維持する。
- iOS の suspend で 30 秒を超えても同じ未完了操作を復旧する。
- Cookie のみ受領して body を失った場合にも別の子を発行しない。
- logout、account delete、期限切れ、次世代へ更新済みの場合は古い子を復活させない。
- nonce・token・selector・hash を診断に記録しない。

## 方針

`X-Refresh-Operation` に、診断 flowId と別の暗号的乱数 UUID を送る。送信前に Web は localStorage、Mobile は既存 SecureStore へ保存する。同一操作を transport の retry とプロセス再起動で共有する。

サーバーは親ごと一つの子と operation hash の関係を transaction で保存する。秘密の操作 nonce と親または子の token の検証に成功した場合だけ、未失効の同じ子を返す。再送によって有効期限を延長しない。子の次の rotation または family の logout が復旧を閉じる。

子 token の復旧はドメインを分けた HMAC により再構築する。平文 token / nonce を DB に追加保存しない。user 行の lock で family の失効と rotation の競合を制御する。header のない旧クライアントも受け付け、新方式で作成済みの親から legacy grace で別の子を増やさない。保存方式・鍵変更・rollback 時の制約は [運用手順](../ops/auth-refresh-recovery.md) に記録する。

Mobile は token と pending nonce を一つの保存単位にし、既存の平文 token key から移行する。保存前の送信はしない。Web は Web Locks 内で pending の作成・送信・完了を管理し、成功応答を使用できるまで pending を保持する。

ネイティブ依存・設定・runtime は変更しない。Mobile は JS の変更を両プラットフォームへ OTA 配信する。DB migration と API を先に配信する。配信はこの会話での本番リリースと費用の了承済み範囲。

## 作業状況

- 調査完了: 本番 WAE と Web / Mobile / backend の経路を照合済み。
- workspace: 既存 worktree、branch `codex/auth-reload-recovery`、開始点 `bc5372da`。
- 実装済み: backend の永続復旧、Mobile の atomic 保存、Web の pending 保存。境界の回帰テストを追加中。
- 検証済み: 実 PostgreSQL 14 の隔離 DB (localhost:55439) に migration 適用。20 並列全成功で子一つ、48 秒後の親/子再取得、異 nonce / legacy fork 拒否、12 回の更新/logout 競合後に有効 token が残らないことを確認。
- ブラウザ: Firefox 151 / Chromium の両方で、HTTP 応答 gate による headers 未受領 2 回 reload と Cookie 受領後 body ロスの旧実装失敗を確認。修正後の再検証中。隔離 PGlite のテスト用ポートは 3457 / 5176。
- チェック済み: Web unit 47 テスト・ブラウザ E2E 9 テスト、Mobile auth 88 テスト、backend auth 119 テストと追加 HTTP 境界テスト、型検査、lint、Knip。Android / iOS の 1.1.0 native 基準 `d2b94ed8` / `062508d2` から OTA safety を確認。
- 初回全体検証: 2,873 件成功、更新中だった旧 logout / CAS 期待値の 2 件が失敗。期待値修正後の認証全体再実行は成功。固定差分で全体を再検証する。
- 独立レビュー: Mobile / backend / schema の設計・テスト観点は問題なし。ロジック・セキュリティ観点で以下の 2 件を修正し、再レビューも LGTM。
  - 新 session Cookie と旧 nonce が残った場合、有効 token を 401 で消さず 409 と新 nonce で回復させる。
  - DB 例外に含まれる query parameters / operation hash を共通ログに渡さず、固定メッセージの一時エラーへ変換する。
- 修正後の検証: Web unit 61 件、Firefox / Chromium の認証 E2E 11 件、backend 関連 44 件と独立レビューの回帰 16 件が成功。実 PostgreSQL でも新 session の 409 → 新 nonce で成功することを追加確認。Web 本番ビルド成功。
- 未完了: 固定差分での全体 CI 相当チェック、PR CI、本番・両 OS OTA 配信確認。

## 設計上の参照

Web Locks は document の終了時に解放されるため、サーバー側の commit と連動した保護には使えない: [Web Locks §2.6](https://www.w3.org/TR/web-locks/#termination)。token の系列と失効を保持して再利用を扱う: [OAuth Security BCP §4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2)。
