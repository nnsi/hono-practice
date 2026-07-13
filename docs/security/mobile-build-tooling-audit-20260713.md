# Mobile build-tooling dependency audit — 2026-07-13

## Decision

The five high-severity findings from `pnpm audit --prod` are fixed with a scoped
override from the legacy `@expo/plist@0.0.18` dependency to
`@xmldom/xmldom@0.8.13`. The override is limited to the `@bacons/xcode` build-tooling
path and is verified by Expo config introspection, Expo Doctor, and bundle checks.

Two moderate findings remain accepted for this release candidate:

- `uuid@8.3.2` under `@bacons/apple-targets -> @bacons/xcode`
- `uuid@7.0.3` under `expo -> @expo/config-plugins -> xcode`

The advisory concerns caller-provided output buffers in UUID v3/v5/v6. These packages
are build-time Xcode project generators; Actiko does not pass untrusted buffers or call
the affected UUID variants at runtime. Forcing a major `uuid` version outside each
upstream package's declared range carries a greater native-build regression risk.

## Revisit trigger

Replace the risk acceptance when Expo / `@bacons/apple-targets` publishes a compatible
dependency chain using a patched UUID version. The dependency audit remains a release
CI gate, so a severity increase or a new runtime path fails the recorded expectation.
