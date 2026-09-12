# Actiko

個人向け活動記録アプリ。pnpm monorepo、Hono / Cloudflare Workers、Neon Postgres、Web は React / Dexie、Mobile は Expo / SQLite。

## 作業方針

- 「必要なら〜できる」のような次のアクションを促す締め方はしない。
- テキストは UTF-8 で保存する。
- 現在の workspace を使う。別 worktree は隔離が必要な作業で作成し、アプリが用意した worktree を重ねて作らない。
- 既存 dev server は再利用する。接続先は対象 workspace の env と設定から確認し、起動・停止は自分の作業に属するものに限る。
- 依頼範囲の成果物（実装・検証・不具合修正・PR など）を完成させる。初稿だけで完了にせず、承認済みの範囲では工程ごとに確認し直さない。仕様・費用・破壊的操作の未承認事項があるときに確認する。
- 対象ディレクトリの AGENTS.md を読む。共通 skill の正本は `.agents/skills/`、`.claude/skills/` は呼び出し用の入口。

## 検証

- 変更した挙動を確かめるテストを選ぶ。UI は実際の操作、DB は隔離 DB で migration と読み書きを確認する。
- 検証コマンドは `pnpm run test-once`、`pnpm run tsc`、`pnpm run lint`。アプリの実行コード・依存・ビルド設定を含む PR や横断変更は `pnpm run ci-check`。文書・指示だけなら参照先と手順、hook なら対象イベントでの入出力を検証する。
- `pnpm run fix` は全体に `--unsafe` な修正を加えるため、通常の検証には使わない。整形・修正は変更ファイルに絞り、差分を確認する。
- 失敗は出力と比較可能な baseline で切り分ける。検証した範囲と未検証事項を報告する。
- 共有 API・同期・認証の変更では Web / Mobile 両方の利用箇所を確認する。

## 課金を伴う操作

- EAS Build / Submit、有料 API、クラウド deploy、従量課金 SaaS などは、直前に操作内容と課金の可能性を示して明示承認を得る。実装・検証・配布の依頼だけを課金承認とは扱わない。課金不明も確認対象。
- EAS Build 前は `eas account:usage <account-name> --json` で current cycle を確認し、結果を承認依頼に含める。`builds.plan.percentUsed >= 100` は追加課金状態、取得失敗・不明は追加課金リスクありと扱う。100% 未満でも集計遅延による課金リスクを説明する。
- credit 超過・従量課金移行の警告を検出したら停止し、承認なしに続行・再投入しない。

## Mobile の native 変更

- 依存導入・設計確定前に OTA 可否と iOS / Android の再 build 要否を判定する。
- `apps/mobile/package.json`、`app.config.ts`、`eas.json`、`ios/`、`android/`、config plugin、新規モバイル依存は native 変更候補。`react-native-*` / `expo-*` などは JS-only と確認できるまで候補扱い。
- native 変更の可能性があれば、実装前に依存名・理由・OTA 可否・再 build 要否・費用と運用影響を示して承認を得る。build 回避・OTA 限定・課金回避の制約を守る。
