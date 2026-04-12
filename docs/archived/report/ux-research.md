# UXリサーチレビュー

作成日: 2026-03-24
対象: `apps/mobile` コードベース
前提: 実装コード、ルーティング、主要フォーム、ダイアログ、記録フロー、設定、CSV入出力、統計表示を確認し、Nielsenの10ヒューリスティック、認知負荷、情報設計、アクセシビリティ、モバイル操作原則の観点で評価した。

## 1. 総合評価
- UXスコア（100点満点）: 60
- 一言要約: 高機能だが、情報設計とアクセシビリティの不足により、初見ユーザーには学習コストが高く、支援技術ユーザーには主要操作の把握が難しい。

## 2. 致命的な問題（Critical）

※ユーザーが目的達成できないレベル

- 問題: CSVエクスポートとCSVインポートの契約が一致しておらず、バックアップや復元でデータ意味を保持できない。
- 発生箇所: `src/components/csv/CSVImportModal.tsx:52,164-165,221,231-232`, `src/components/csv/CSVExportModal.tsx:156`
- なぜ問題か（UX原則ベース）: `CSVインポート互換` と表示されている一方で、インポート時は単一 `selectedActivityId` を必須にし、各行の `activity` / `kind` 列を復元せず `activityKindId: null` で保存している。これは Nielsen の「一貫性と標準」「エラー防止」に反し、ユーザーのメンタルモデルと実際の挙動が一致しない。復元目的の操作で情報が潰れるため、目的達成に失敗する。
- 改善案: インポート側で `activity` / `kind` 列を既存データに自動マッピングし、不明値だけ解決UIを出す。単一アクティビティ専用にするならテンプレートと説明文を `date,quantity,memo` ベースへ改め、互換表現を削除する。

- 問題: アイコンのみの主要操作がアクセシブルネームを持たず、スクリーンリーダー利用者は編集・削除・閉じる・日付移動を識別しづらい。
- 発生箇所: `src/components/common/ModalOverlay.tsx:76-77`, `src/components/actiko/ActivityCard.tsx:97-102`, `src/components/goal/GoalCardHeader.tsx:140-160`, `src/components/tasks/TaskCard.tsx:153-168`, `src/components/actiko/DateNavHeader.tsx:24-25,47-48`
- なぜ問題か（UX原則ベース）: WCAG 4.1.2 Name, Role, Value と Nielsen の「認識しやすさ」に反する。コード上で明示的な `accessibilityLabel` が付いているのは Google ログイン系にほぼ限られており、支援技術では複数の無名ボタンが並ぶ状態になる。支援技術ユーザーにとっては主要タスクの遂行自体が難しい。
- 改善案: すべてのアイコンボタンに `accessibilityRole="button"` と文脈付き `accessibilityLabel` を追加する。例: `タスク「企画書」を削除`, `モーダルを閉じる`, `前日へ移動`。破壊的操作には `accessibilityHint` も付ける。

## 3. 重要な問題（Major）

※UXを明確に損なう

- 問題: 初回導線で6タブを同時提示し、概念差の大きい機能群を名称だけで理解させている。
- 発生箇所: `app/_layout.tsx:93,106`, `app/(tabs)/_layout.tsx:23-28,122-127`
- なぜ問題か（UX原則ベース）: 「認識 rather than recall」「美的で最小限の設計」に反する。`Actiko / Daily / Stats / Goal / Tasks / Settings` は粒度も言語も揃っておらず、初回ユーザーがどこから始めるべきか判断しづらい。コードベース上に onboarding / tutorial / help 導線も見当たらない。
- 改善案: 初回は `アクティビティ作成 → 今日記録 → 目標設定 → 振り返り` の順に導く。タブ名も目的ベースで統一し、例として `記録 / 今日 / 分析 / 目標 / タスク / 設定` に揃える。

- 問題: モーダルが背景タップや閉じるボタンで即時に閉じ、入力途中の内容を無確認で破棄する。
- 発生箇所: `src/components/common/ModalOverlay.tsx:48,76-77`, `src/components/actiko/useCreateActivityDialog.ts:127-129`, `src/components/goal/CreateGoalDialog.tsx:64-66,78`, `src/components/tasks/TaskCreateDialog.tsx:68-73`
- なぜ問題か（UX原則ベース）: Nielsen の「ユーザーのコントロールと自由」「エラー防止」に反する。モバイルでは背景誤タップが起きやすく、フォームが長いほど再入力コストが高い。
- 改善案: dirty state を持ち、未保存変更がある場合は背景タップで閉じないか、`破棄する / 戻る` の確認を表示する。

- 問題: 記録モードの用語が実装寄りで、行動イメージが湧きにくい。
- 発生箇所: `src/components/actiko/RecordingModeSelector.tsx:29-33,85,114`
- なぜ問題か（UX原則ベース）: Nielsen の「実世界との一致」「認識しやすさ」に反する。`バイナリ` `テンキー` `カウンタ` `ステップ値（カンマ区切り）` は開発者語彙に近く、初見では挙動を推測しづらい。認知負荷が上がり、最初のアクティビティ作成で離脱しやすい。
- 改善案: モード名を `1回タップで記録` `時間を測って記録` `+1/+10で加算` `数字入力` のような行動ベースに変更し、各項目の下に1行説明を付ける。

- 問題: アクティビティや種類の選択UIが件数増加に弱く、探索コストが急増する。
- 発生箇所: `src/components/tasks/TaskActivityPicker.tsx:50-54,106-110`, `src/components/goal/CreateGoalDialog.tsx:107-127`, `src/components/daily/ActivitySelectOverlay.tsx:68,84`
- なぜ問題か（UX原則ベース）: 情報探索の観点で、横スクロール選択は全候補の把握に不向きであり、可視性も低い。Goal作成では `min-w-[80px]` かつ `numberOfLines={1}` のため長い名称が切れ、識別コストが上がる。
- 改善案: 検索可能な bottom sheet に置き換え、`最近使った / すべて` のグルーピングを導入する。Goal作成は2列以上のリストにして名称を2行まで表示する。

- 問題: ログイン・登録フォームがプレースホルダ依存で、入力後に項目名が消える。
- 発生箇所: `src/components/root/LoginForm.tsx:58,67`, `src/components/root/CreateUserForm.tsx:117,125`
- なぜ問題か（UX原則ベース）: WCAG 3.3.2 Labels or Instructions と Nielsen の「認識しやすさ」に反する。ユーザーは項目ラベルを短期記憶で保持する必要があり、入力ミスの自己修正もしづらい。
- 改善案: 各入力の上に常時表示ラベルを置き、パスワード条件は補助テキストとして固定表示する。

- 問題: 同期状態は `failed` を持つのに、UIでは `pending` のみが可視化される。
- 発生箇所: `src/repositories/activityLogRepository.ts:34`, `src/repositories/taskRepository.ts:27`, `src/components/daily/LogCard.tsx:39,46`, `src/components/daily/TaskList.tsx:15,65`
- なぜ問題か（UX原則ベース）: Nielsen の「システム状態の可視化」に反する。`送信中` と `送信失敗` を区別できないため、ユーザーはデータが安全かどうか判断できない。
- 改善案: `failed` を赤系バッジや再試行アクション付きで明示し、`pending` と明確に視覚差を付ける。

- 問題: 小さい文字サイズと低コントラスト、さらに小さいタップターゲットが重なっている。
- 発生箇所: `app/(tabs)/_layout.tsx:74,77,79`, `src/components/goal/GoalHeatmap.tsx:43,68,72-77`, `src/components/goal/GoalCardHeader.tsx:140,145,160`, `src/components/tasks/TaskCard.tsx:145,153,161,168`
- なぜ問題か（UX原則ベース）: タブバーは 10px 表示で、白背景に対する `#a8a29e` は約 2.52:1、`#d97706` は約 3.19:1 で small text の 4.5:1 を下回る。加えて `p-1` や `p-1.5` のアイコンボタンは 44-48px 推奨タップ領域より小さく、モバイルで誤操作しやすい。
- 改善案: タブ・凡例・補助テキストは最低 12-14px とし、文字色を `gray-600` 以上へ上げる。アイコン操作は 44px 以上の hit area を保証する。

## 4. 軽微な問題（Minor）

※改善余地

- 問題: Goalヒートマップの凡例が4色あるのに、意味ラベルが十分に対応していない。
- 発生箇所: `src/components/goal/GoalHeatmap.tsx:72-77`
- なぜ問題か（UX原則ベース）: 情報設計の観点で、データエンコーディングと凡例の対応が弱い。ユーザーは色意味を記憶し直す必要がある。
- 改善案: `未活動 / 活動あり / 一部達成 / 全達成` を各色に明示的に対応させる。

- 問題: Statsの軸ラベルや目標線ラベルが非常に小さく、精読タスクに向かない。
- 発生箇所: `src/components/stats/ActivityChart.tsx:125,174,295`
- なぜ問題か（UX原則ベース）: 視認性と認知負荷の観点で不利。比較や異常値確認のために追加の拡大・注視が必要になる。
- 改善案: 軸ラベルを拡大し、タップで日別値を表示する簡易ツールチップを追加する。

- 問題: 用語のローカライズと粒度が揃っていない。
- 発生箇所: `app/(tabs)/_layout.tsx:23-28`
- なぜ問題か（UX原則ベース）: Nielsen の「一貫性と標準」に反する。英語と日本語、単数と複数、ブランド名と機能名が混在し、ナビゲーション学習を遅らせる。
- 改善案: タブ名を同一言語・同一粒度・同一視点で統一する。

## 5. 良い点
- なぜ良いか（UX原則ベース）: CSVインポートは段階表示、件数サマリ、行単位バリデーション、進捗表示があり、`Visibility of system status` と `Error prevention` を満たしている。`src/components/csv/CSVImportModal.tsx:81-87,280,357,379,455`
- なぜ良いか（UX原則ベース）: Daily画面は「その日の記録」と「その日のタスク」を同じ日付軸で統合しており、コンテキストスイッチを減らしている。`src/components/daily/DailyPage.tsx:84-92,128-136,154-173`
- なぜ良いか（UX原則ベース）: ErrorBoundary は再試行回数を制御し、通常リトライと回復導線を分けているため、`Help users recover from errors` に沿っている。`src/components/root/ErrorBoundary.tsx:20,58,66,86,122,139`
- なぜ良いか（UX原則ベース）: 記録フォームはアクティビティごとに入力方式を切り替え、保存時にフィードバックと同期を流すため、習熟後の操作効率が高い。`src/components/common/LogFormBody.tsx:54-55,121,124`

## 6. ユーザーフロー分析
- 想定ユーザー: 29歳の知識労働者。ランニング、読書、学習など複数の定量習慣を日次で記録し、今日のタスクも同じアプリで管理し、月次で達成度を見返したい。
- 想定ユーザーが目的達成するまでのステップ: 1. 登録またはログインする。
- 各ステップでの摩擦点: フォームがプレースホルダ依存で、入力中に項目文脈が消える。
- 想定ユーザーが目的達成するまでのステップ: 2. 初回起動後にどのタブから始めるか判断する。
- 各ステップでの摩擦点: 6タブの役割差が大きく、開始地点を名称だけで選ばせている。
- 想定ユーザーが目的達成するまでのステップ: 3. 最初のアクティビティを作成する。
- 各ステップでの摩擦点: 記録モードの意味理解が先に必要で、行動イメージより設定理解が先行する。
- 想定ユーザーが目的達成するまでのステップ: 4. 今日の活動を記録する。
- 各ステップでの摩擦点: アクティビティ数が増えると選択UIに検索がなく、探索時間が増える。
- 想定ユーザーが目的達成するまでのステップ: 5. 目標やタスクをアクティビティに紐づける。
- 各ステップでの摩擦点: 負債、種類、日次目標、凍結期間など複数概念の関係がUI上で十分説明されない。
- 想定ユーザーが目的達成するまでのステップ: 6. 月次で振り返る、またはCSVでデータを保全する。
- 各ステップでの摩擦点: Statsは精読導線が深く、CSV入出力は期待と実際の挙動が一致していない。

## 7. 優先度付き改善リスト
- 優先度（High / Medium / Low）: High
- 改善内容: CSVインポートを `activity` / `kind` 対応にし、export/import 契約を一致させる
- 影響範囲: バックアップ、移行、データ信頼性、設定画面
- 実装コスト（Low / Medium / High）: Medium

- 優先度（High / Medium / Low）: High
- 改善内容: すべてのアイコンボタンにアクセシビリティ名を付け、44px以上のタップ領域を保証する
- 影響範囲: 全画面、特にカード操作・モーダル・日付移動
- 実装コスト（Low / Medium / High）: Medium

- 優先度（High / Medium / Low）: High
- 改善内容: 初回導線を `アクティビティ作成 → 記録 → 振り返り` に再設計し、タブ名を目的ベースで統一する
- 影響範囲: ナビゲーション、学習コスト、情報設計
- 実装コスト（Low / Medium / High）: High

- 優先度（High / Medium / Low）: Medium
- 改善内容: フォームモーダルに unsaved changes ガードを入れ、背景タップ閉じを制御する
- 影響範囲: アクティビティ作成、目標作成、タスク作成、編集ダイアログ
- 実装コスト（Low / Medium / High）: Medium

- 優先度（High / Medium / Low）: Medium
- 改善内容: アクティビティと種類の選択UIを検索付き bottom sheet に置き換える
- 影響範囲: 記録、目標作成、タスク作成・編集
- 実装コスト（Low / Medium / High）: Medium

- 優先度（High / Medium / Low）: Medium
- 改善内容: 記録モード名を行動ベースに変更し、各モードに説明文と利用例を付ける
- 影響範囲: アクティビティ作成・編集、学習コスト
- 実装コスト（Low / Medium / High）: Low

- 優先度（High / Medium / Low）: Medium
- 改善内容: `failed` 同期状態をUIに明示し、再試行か保留かを区別して見せる
- 影響範囲: Daily、Tasks、Actiko、信頼性認知
- 実装コスト（Low / Medium / High）: Low

- 優先度（High / Medium / Low）: Low
- 改善内容: Goalヒートマップ凡例とStatsの軸ラベルを読みやすくし、表の段階開示を見直す
- 影響範囲: Goal、Stats
- 実装コスト（Low / Medium / High）: Low
