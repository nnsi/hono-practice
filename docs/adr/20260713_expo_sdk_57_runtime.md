# Expo SDK 57 / React Native 0.86 と runtime 分離

## Status

Accepted (2026-07-13)

## Context

モバイルアプリは Expo SDK 55 から Expo SDK 57 / React Native 0.86 へ更新する。WidgetKit、Android AppWidget、Expo native module を含むため、この更新は JavaScript bundle のみの OTA では配信できない。SDK 55 の公開済み binary は app version / runtime `1.0.0` を使用していた。

## Decision

- Expo SDK 57 と React Native 0.86 を採用する。
- app version と `runtimeVersion` を `1.1.0` に揃え、SDK 55 binary の runtime `1.0.0` から分離する。
- native source、native dependency、config plugin、entitlement、Expo SDK を変更した release は Native build を必須とする。
- `ios.buildNumber` / `android.versionCode` は EAS の remote app version と `autoIncrement` で管理し、repository に推測値を固定しない。
- production config は bundle ID、EAS project/owner、Apple team ID、RevenueCat iOS/Android key を必須とし、development 用 bundle ID の混入を拒否する。
- OTA 可否の機械判定は release impact guard を正とし、native 差分を含む SHA への OTA operation を拒否する。

## Consequences

`1.1.0` は iOS / Android の再buildと署名済み配布が必要になる。SDK 55 binary は `1.1.0` 向け OTA を受信しない。build number / version code の最終値は build 直前に EAS remote state と照合する。
