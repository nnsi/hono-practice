---
name: ota-update
description: native build との互換性を確認して EAS Update を配信する。
---

# OTA Update

ルート AGENTS.md の native 判定と課金承認条件に従う。配信対象の channel・environment・platform と、インストール済み native build の基準 commit / runtime を特定する。

基準 build 以降の変更一覧を `scripts/mobile-ota-safety.js --files <一覧ファイル>` に渡す（`node` で実行）。直近 commit だけで判定しない。native 候補や runtime 不一致は OTA で押し切らず、build へ無断で切り替えない。

配信の詳細は `docs/ops/mobile-ota.md`。`apps/mobile/.env` の export と配信環境の `EXPO_PUBLIC_*` を確認し、現在の CLI の help と突き合わせて実行コマンドを組み立てる。秘密の値は表示しない。

この repo では Android / iOS を個別に配信する。初回や環境変数変更時はキャッシュを消す。

「iOSだけOTA配信して」などの明示依頼は、その対象への配信承認として扱う。配信内容・互換性・利用枠を確認して報告し、承認済みの範囲ならそのまま配信・結果確認まで実行する。利用枠内で超過警告がない場合、一般的な課金可能性や集計遅延だけを理由に再承認を求めない。配信対象・内容の範囲変更、未承認の追加費用、超過・従量課金移行の警告など新たな未承認事項が判明した場合に限り、その差分を示して確認する。互換性未確認のままの配信や、native build への無断切り替えはしない。

各 Update ID・Dashboard URL・実際に確認できた反映状況を報告する。
