# バイナリモードのActivityLog集約

## ステータス

決定（更新: 2026-03-15）

## コンテキスト

バイナリモードでは1タップ=quantity:1のActivityLogが1件作成される。勝敗記録のように頻繁にタップするユースケースでは、1日に10〜20件のログが生成される。

これにより:
- Dailyページの表示が冗長になる（他のモードは1日1件程度なのにバイナリだけ大量）
- 長期利用でログテーブルが肥大化する（他のモードと比べて桁違いのレコード数）

一方、1タップ=1ログの利点として各タップのタイムスタンプが残るが、実際に見返すユースケースはない。

### sync-time集約の問題

当初はsync時（syncActivityLogs内）で集約する方針だったが、バイナリモードは1タップごとに即座に`syncEngine.syncActivityLogs()`を呼び出すため、pendingログが常に1件しかなく集約対象が存在しない問題が判明した。集約が機能するのはオフライン時（複数のpendingログが蓄積される場合）のみで、通常利用では事実上集約されない。

## 決定事項

### 集約ルール
- **対象**: recordingMode=binary のActivityのログのみ
- **集約単位**: 日付（date） + activityId + activityKindId
- **集約方法**: 同一キーのログをquantity合算し1件にまとめる
- **time**: 最初の1件のtimeを採用
- **memo**: 空文字（バイナリモードではmemoを入力しない）

### 集約タイミング: リアルタイム（ログ作成時）
- **LogFormBodyのhandleSave内でべた書き実装**
- ログ作成時にローカルDB（Dexie/expo-sqlite）内の既存ログを検索し、同一キー（date+activityId+activityKindId）のログがあればquantityを加算更新する
- 既存ログがない場合は通常通り新規作成する
- sync層からの集約ロジック呼び出しは削除（aggregateBinaryLogsの呼び出しをsyncActivityLogsから除去）

### 集約ロジックの配置
- LogFormBodyのhandleSave内にべた書き
- Web（Dexie）とMobile（expo-sqlite）で同一ロジックをそれぞれのDB APIで実装

## 結果

- Dailyページの表示がすっきりする（バイナリモードも他のモードと同様に日単位1〜2件）
- 長期利用でもログテーブルの肥大化を防げる
- タイムスタンプ情報は失われるが、ユースケース上問題なし
- 通常のオンライン利用でも確実に集約される（sync-time方式の問題を解消）

## 備考

- `packages/sync-engine/core/aggregateBinaryLogs.ts` は削除せず保持（将来の再利用可能性のため）
- バイナリモード以外のモードへの適用は現時点で不要
