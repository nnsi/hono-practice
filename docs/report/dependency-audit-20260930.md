# 依存監査 2026年9月30日

対象はworkspace `2cabf90a`。`pnpm audit --json` と `pnpm audit --prod --json` の全advisoryを、依存経路と利用APIで一次評価した。以下のadvisory一覧は更新前の記録として保持する。これは到達可能性の静的な一次評価で、各PoCを本番で実行した結果ではない。

## 修正結果

更新後は `pnpm audit --json` / `pnpm audit --prod --json` ともcritical/high/moderate/lowが全て0。ignoreやaudit除外は使っていない。

Hono 4.13.5、Vitest 4.1.11、EAS CLI 24.8.0、Drizzle Kit 0.31.11、@hono/node-server 2.1.3、sharp 0.35.5へ更新。親が古い版を固定している間接依存はrootのversion範囲付きoverrideで修正版へ固定した。

major更新で既存呼び出しとの互換性がなくなる3箇所をpnpm patchで補正した。

- query-string 7: decode-uri-component 0.5のESM default exportを利用する。
- Metro 0.84.4: image-size 2に画像のパスではなくバッファを渡す。
- EAS CLI 24.8.0: ts-deepmerge 8のnamed merge exportを利用する。

これらのpatchを削除する際は親ライブラリの対応状況を確認し、`scripts/security-dependencies.test.ts`、`apps/mobile/src/security-dependencies.test.ts` とMobile exportで検証する。既存のreact-native-css-interop patchは維持。

Mobileの直接依存の解決版を更新前後で比較し、変わったのはpure JSのHonoのみ。Expo/RN/RevenueCatを含むnative依存の版、native設定は変更していない。今回はローカルのJS bundle生成のみで、EAS native build/OTA配信/本番deployは行っていない。JSの修正を配布する際は通常のruntime互換確認が必要。

## 更新前の集計

| 対象 | critical | high | moderate | low | 合計 |
|---|---:|---:|---:|---:|---:|
| 全依存 | 1 | 87 | 44 | 9 | 141 |
| prod指定 | 0 | 37 | 17 | 1 | 55 |

全依存のadvisoryエントリーは124、GHSA IDの重複を除くと102、packageは28種類。141はpnpmのmetadata集計であり、独立した141個の本番攻撃経路ではない。prod指定にもExpo CLI等のビルド用依存が含まれる。逆にdevDependenciesのツールも署名・CI環境では重要。auditが表示するpathは代表経路であり、全依存経路を列挙するとは限らない。

[全124エントリーの機械可読な判定](dependency-audit-20260930.json)には両auditから得たpath、version、修正範囲、判断を保存した。最新masterとの差分ではExpo UI追加があるが、今回指摘された版の更新は確認されない。最新SHAでの再監査は依存更新時に必要。

## 更新時の優先順位

1. Mobile runtimeのdecode-uri-componentは非到達と断定せず更新優先。Honoも修正版へ揃える。
2. EAS CLIと配下のtar/node-forgeを更新。criticalはサーバー侵害ではなくarchive解凍DoSだが、開発・署名環境の保護が必要。
3. Expo/Metro、Web build、テスト依存は親更新を優先する。親で未解消のものは修正範囲を指定したoverrideと呼び出し側の互換patchを使い、実際のバンドル生成とツール操作で確認する。
4. Mobile依存・Expo設定に波及する更新は、native差分、OTA可否、再buildと費用影響を判定してから実施する。今回の修正ではnative更新やbuildは行っていない。

## パッケージ別の判断

| Package | 範囲 | 判断 | 更新候補 |
|---|---|---|---|
| `esbuild` | 開発ツール | drizzle-kitのloader経由。serve APIの直接利用なし。開発サーバー経路の問題でWorkers本番APIには非該当。 | 0.25.0以上を含むdrizzle-kit/loaderへ更新 |
| `node-forge` | 署名ツール | EAS CLIの証明書・鍵処理。ユーザーの記録APIには非搭載だが、署名環境への影響は無視しない。 | 1.4.0以上を含むEAS CLIへ更新 |
| `diff` | 開発ツール | EAS CLIのpatch処理。未信頼patch入力時のDoS。 | 8.0.3以上。major更新は親CLIから |
| `tar` | 配布ツール 優先 | EAS CLIのarchive処理。criticalは解凍量無制限によるDoS。ユーザーがAPIへtarをuploadする経路は検出なし。CLIで取得するarchiveへの影響は残る。 | 7.5.21以上で今回検出分をカバー。critical単体の修正版7.5.19では他の指摘が残る |
| `minimatch` | 開発ツール | EAS CLIのファイルpattern処理。外部patternを受けるアプリAPIは検出なし。 | 5.1.8以上 |
| `ajv` | 開発ツール | EAS CLIのJSON schema検証。対象は$dataを使う未信頼入力。アプリAPIはZod。 | 8.18.0以上 |
| `yaml` | 開発ツール | EAS CLIの設定読込。深いYAMLによるDoS。 | 2.8.3以上 |
| `@xmldom/xmldom` | ビルドツール | EAS/Expo/plist/Xcode設定経由。XMLの注入・DoS。記録データのXML処理は検出なし。build入力は影響対象。既存overrideは0.8.13のため新規指摘を解消しない。 | 0.8系は0.8.15以上、0.9系は0.9.12以上。0.7系は親依存から更新 |
| `uuid` | ビルドツール | 古い版はExpo/Xcode/EAS配下。問題はbuffer付きv3/v5/v6。アプリ直接依存は14.0.1で、この指摘の対象外。 | 親依存更新。11.1.1以上への一括major overrideはしない |
| `joi` | ビルドツール | EAS CLI/build-jobの設定検証。recursive link、messages、rename、isoDateの入力が条件。 | 17.13.7以上 |
| `ts-deepmerge` | ビルドツール | EAS CLIの設定merge。未信頼オブジェクトからのprototype method上書き。 | 8.0.0以上を含む親CLIへ更新 |
| `brace-expansion` | ビルドツール | Expo/EAS/glob経由。glob入力に対する複数種のDoS。アプリの利用者入力をglob展開する経路は検出なし。 | 1.1.21 / 2.1.7 / 5.0.12以上を各major内で選ぶ |
| `fast-uri` | Webビルドツール | workbox-build→ajvのschema処理。host正規化・SSRF条件の指摘で、アプリのfetch先検証には使用していない。 | 3.1.8以上 |
| `postcss` | Webビルドツール | CSS build時のsourceMappingURL読込。利用者提供CSSを本番でcompileする経路は検出なし。 | 8.5.23以上 |
| `undici` | テストツール | jsdomのHTTP/WebSocket処理。cache、cookie、retry、TLS、圧縮処理の指摘。本番Workersはこのjsdom依存を使わない。テストで外部ページを読む場合は影響が残る。 | 7.29.1以上 |
| `hono` | 実行時 個別判定 | API本体でも使用。auditの代表pathがAdminだからAdmin限定とは判断しない。下のadvisory別判断を参照。 | 4.13.5以上。全workspaceとroot overrideを揃える |
| `js-yaml` | ビルドツール | EAS help / Expo xcpretty経由。YAML merge/omapによるDoS。 | 3.15.2 / 4.3.2以上を各major内で選ぶ |
| `nanoid` | ビルドツール | EAS/PostCSS経由。負数・zero・巨大sizeでの生成処理が条件。 | 3.3.18以上 |
| `@hono/node-server` | ローカル実行時 | NodeローカルAPIとテストサーバー。WebSocket upgrade利用は検出なし。Workers本番には非搭載。トンネルを使うローカル確認前に更新推奨。 | 2.0.10以上 |
| `decode-uri-component` | Mobile実行時 優先 | expo-router→query-string。routerのJS内にquery-string importあり。普段のfork parserはURLSearchParamsだがreact-navigation fallback等も存在し、全経路非到達とは断定しない。悪意あるpercent-encoded入力のDoSを優先して解消。 | 0.5.0以上。0.x minor変更のためquery-stringとの互換性とdeep linkを確認 |
| `browserslist` | ビルドツール | Babelのcompile target決定。query cache / custom stats入力が条件。 | 4.28.7以上 |
| `vitest` | テストツール | redirect mock経由のファイル参照。テスト基盤を更新。本番bundleには含まない。 | 4.1.11以上 |
| `@vitest/mocker` | テストツール | Vitestと同じadvisory。独立した本番脆弱性として二重評価しない。 | Vitestと同時に4.1.11以上 |
| `baseline-browser-mapping` | ビルドツール | Browserslistの入力処理。invalid inputでprocess終了。 | 2.11.0以上 |
| `sharp` | 開発ツール | root devDependency。apps/packages/scripts/infraの直接importは検出なし。画像処理ツールで未信頼HEIFを読む場合はlibheif指摘が適用。 | 0.35.4以上。バイナリ依存を含むので実行確認 |
| `smol-toml` | 開発ツール | knipの設定解析。未信頼TOMLでDoS。 | 1.7.1以上 |
| `image-size` | Mobileビルドツール | Expo Metroで画像サイズを解析。JXL/HEIF/ICNSによるloop。通常のアプリ内画像選択処理とは別経路。 | 2.0.3以上を含むMetro/Expoへ。1→2 majorを無検証でoverrideしない |
| `moment` | 開発ツール | EAS logger→bunyan。非文字列localeでpath traversal。 | 2.31.0以上 |

## 全指摘一覧

同一GHSAでも対象major・修正範囲が違う場合は別行に残した。各行の扱いは上のpackage判断を継承し、Honoは個別に記載する。

| Package / GHSA | 重大度 | 導入版 | 修正版範囲 | 内容と適用判断 |
|---|---|---|---|---|
| `esbuild` [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | moderate | 0.18.20 | `>=0.25.0` | esbuild enables any website to send any requests to the development server and read the response. 開発ツール。上記package判断参照。 |
| `node-forge` [GHSA-554w-wpv2-vw27](https://github.com/advisories/GHSA-554w-wpv2-vw27) | high | 1.3.1 | `>=1.3.2` | node-forge has ASN.1 Unbounded Recursion. 署名ツール。上記package判断参照。 |
| `node-forge` [GHSA-5gfm-wpxj-wjgq](https://github.com/advisories/GHSA-5gfm-wpxj-wjgq) | high | 1.3.1 | `>=1.3.2` | node-forge has an Interpretation Conflict vulnerability via its ASN.1 Validator Desynchronization. 署名ツール。上記package判断参照。 |
| `node-forge` [GHSA-65ch-62r8-g69g](https://github.com/advisories/GHSA-65ch-62r8-g69g) | moderate | 1.3.1 | `>=1.3.2` | node-forge is vulnerable to ASN.1 OID Integer Truncation. 署名ツール。上記package判断参照。 |
| `diff` [GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx) | low | 7.0.0 | `>=8.0.3` | jsdiff has a Denial of Service vulnerability in parsePatch and applyPatch. 開発ツール。上記package判断参照。 |
| `tar` [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx) | high | 7.5.7 | `>=7.5.8` | Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain in node-tar Extraction. 配布ツール 優先。上記package判断参照。 |
| `minimatch` [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26) | high | 5.1.2 | `>=5.1.7` | minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern. 開発ツール。上記package判断参照。 |
| `minimatch` [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) | high | 5.1.2 | `>=5.1.8` | minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments. 開発ツール。上記package判断参照。 |
| `minimatch` [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) | high | 5.1.2 | `>=5.1.8` | minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions. 開発ツール。上記package判断参照。 |
| `ajv` [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) | moderate | 8.11.0 | `>=8.18.0` | ajv has ReDoS when using `$data` option. 開発ツール。上記package判断参照。 |
| `tar` [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96) | high | 7.5.7 | `>=7.5.10` | tar has Hardlink Path Traversal via Drive-Relative Linkpath. 配布ツール 優先。上記package判断参照。 |
| `tar` [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256) | high | 7.5.7 | `>=7.5.11` | node-tar Symlink Path Traversal via Drive-Relative Linkpath. 配布ツール 優先。上記package判断参照。 |
| `node-forge` [GHSA-2328-f5f3-gj25](https://github.com/advisories/GHSA-2328-f5f3-gj25) | high | 1.3.1 | `>=1.4.0` | Forge has a basicConstraints bypass in its certificate chain verification (RFC 5280 violation). 署名ツール。上記package判断参照。 |
| `node-forge` [GHSA-q67f-28xg-22rw](https://github.com/advisories/GHSA-q67f-28xg-22rw) | high | 1.3.1 | `>=1.4.0` | Forge has signature forgery in Ed25519 due to missing S > L check. 署名ツール。上記package判断参照。 |
| `node-forge` [GHSA-5m6q-g25r-mvwx](https://github.com/advisories/GHSA-5m6q-g25r-mvwx) | high | 1.3.1 | `>=1.4.0` | Forge has Denial of Service via Infinite Loop in BigInteger.modInverse() with Zero Input. 署名ツール。上記package判断参照。 |
| `yaml` [GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp) | moderate | 2.6.0 | `>=2.8.3` | yaml is vulnerable to Stack Overflow via deeply nested YAML collections. 開発ツール。上記package判断参照。 |
| `node-forge` [GHSA-ppp5-5v6c-4jwp](https://github.com/advisories/GHSA-ppp5-5v6c-4jwp) | high | 1.3.1 | `>=1.4.0` | Forge has signature forgery in RSA-PKCS due to ASN.1 extra field  . 署名ツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-wh4c-j3r5-mjhp](https://github.com/advisories/GHSA-wh4c-j3r5-mjhp) | high | 0.7.13 | `>=0.8.12` | xmldom: XML injection via unsafe CDATA serialization allows attacker-controlled markup insertion. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-2v35-w6hq-6mfw](https://github.com/advisories/GHSA-2v35-w6hq-6mfw) | high | 0.7.13 | `>=0.8.13` | xmldom: Uncontrolled recursion in XML serialization leads to DoS. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-f6ww-3ggp-fr8h](https://github.com/advisories/GHSA-f6ww-3ggp-fr8h) | high | 0.7.13 | `>=0.8.13` | xmldom has XML injection through unvalidated DocumentType serialization. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-x6wf-f3px-wcqx](https://github.com/advisories/GHSA-x6wf-f3px-wcqx) | high | 0.7.13 | `>=0.8.13` | xmldom has XML node injection through unvalidated processing instruction serialization. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-j759-j44w-7fr8](https://github.com/advisories/GHSA-j759-j44w-7fr8) | high | 0.7.13 | `>=0.8.13` | xmldom has XML node injection through unvalidated comment serialization. ビルドツール。上記package判断参照。 |
| `uuid` [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | moderate | 7.0.3, 8.3.2, 9.0.1 | `>=11.1.1` | uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided. ビルドツール。上記package判断参照。 |
| `joi` [GHSA-q7cg-457f-vx79](https://github.com/advisories/GHSA-q7cg-457f-vx79) | moderate | 17.11.0 | `>=17.13.4` | joi has an uncaught RangeError on deeply nested input through recursive `link()` schemas. ビルドツール。上記package判断参照。 |
| `tar` [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh) | moderate | 7.5.7 | `>=7.5.16` | node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing tar parser interpretation differential (file smuggling). 配布ツール 優先。上記package判断参照。 |
| `ts-deepmerge` [GHSA-87mf-gv2c-c62c](https://github.com/advisories/GHSA-87mf-gv2c-c62c) | moderate | 6.2.0 | `>=8.0.0` | ts-deepmerge: Prototype Method Override leads to DoS. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) | high | 2.1.1 | `>=2.1.2` | brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups. ビルドツール。上記package判断参照。 |
| `tar` [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp) | moderate | 7.5.7 | `>=7.5.18` | node-tar: Process crash via PAX numeric path type confusion. 配布ツール 優先。上記package判断参照。 |
| `tar` [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) | critical | 7.5.7 | `>=7.5.19` | node-tar: Decompression/parse DoS via unlimited input. 配布ツール 優先。上記package判断参照。 |
| `tar` [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) | high | 7.5.7 | `>=7.5.18` | node-tar: Negative tar entry size causes infinite loop in archive replace. 配布ツール 優先。上記package判断参照。 |
| `tar` [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) | moderate | 7.5.7 | `>=7.5.17` | node-tar: Uncaught Exception DoS via NUL byte in PAX path/linkpath records. 配布ツール 優先。上記package判断参照。 |
| `fast-uri` [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) | high | 3.1.3 | `>=3.1.4` | fast-uri vulnerable to host confusion via literal backslash authority delimiter. Webビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | high | 1.1.16 | `>=1.1.17` | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | high | 2.1.1 | `>=2.1.3` | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | high | 5.0.7 | `>=5.0.8` | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash. ビルドツール。上記package判断参照。 |
| `postcss` [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | moderate | 8.5.16 | `>=8.5.23` | PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset. Webビルドツール。上記package判断参照。 |
| `undici` [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524) | moderate | 7.28.0 | `>=7.29.0` | undici vulnerable to downstream response desynchronization via retry interceptor. テストツール。上記package判断参照。 |
| `undici` [GHSA-4cwx-7wf7-3272](https://github.com/advisories/GHSA-4cwx-7wf7-3272) | high | 7.28.0 | `>=7.29.0` | undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives. テストツール。上記package判断参照。 |
| `fast-uri` [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) | high | 3.1.3 | `>=3.1.5` | fast-uri vulnerable to host confusion via backslash authority introducer. Webビルドツール。上記package判断参照。 |
| `undici` [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) | moderate | 7.28.0 | `>=7.29.0` | undici vulnerable to CRLF Injection via blob-like body 'type' property. テストツール。上記package判断参照。 |
| `undici` [GHSA-jr45-8vmc-qm54](https://github.com/advisories/GHSA-jr45-8vmc-qm54) | moderate | 7.28.0 | `>=7.29.0` | undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives. テストツール。上記package判断参照。 |
| `undici` [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm) | moderate | 7.28.0 | `>=7.29.0` | undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields. テストツール。上記package判断参照。 |
| `hono` [GHSA-8j4g-w8fx-2239](https://github.com/advisories/GHSA-8j4g-w8fx-2239) | moderate | 4.12.27 | `>=4.12.34` | Hono: ReDoS in CORS middleware via Access-Control-Request-Headers. apps/backend/app.tsのCORSは非空allowHeadersを指定し、対象のheader反射parse経路を回避。 |
| `brace-expansion` [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | high | 5.0.7 | `>=5.0.9` | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | high | 2.1.1 | `>=2.1.4` | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | high | 1.1.16 | `>=1.1.18` | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation. ビルドツール。上記package判断参照。 |
| `js-yaml` [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | high | 3.15.0 | `>=3.15.1` | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported. ビルドツール。上記package判断参照。 |
| `js-yaml` [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | high | 4.3.0 | `>=4.3.1` | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported. ビルドツール。上記package判断参照。 |
| `hono` [GHSA-f23p-vx2j-j53r](https://github.com/advisories/GHSA-f23p-vx2j-j53r) | moderate | 4.12.27 | `>=4.12.34` | Hono: `memo()` retains SSR output across requests, leading to cross-user data disclosure. hono/jsx memo SSRを使用していない。WebはReact SPA。該当API利用なし。 |
| `hono` [GHSA-79qm-7rj5-m7r9](https://github.com/advisories/GHSA-79qm-7rj5-m7r9) | low | 4.12.27 | `>=4.12.34` | Hono: Proxy Helper does not remove response headers listed in the `Connection` header. hono/proxy helperの利用なし。該当API利用なし。 |
| `hono` [GHSA-54fx-42gc-7vw4](https://github.com/advisories/GHSA-54fx-42gc-7vw4) | moderate | 4.12.27 | `>=4.12.34` | Hono: Algorithmic Complexity DoS in Language Middleware. hono/language middlewareの利用なし。該当API利用なし。 |
| `nanoid` [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | high | 3.3.15, 3.3.8 | `>=3.3.16` | nanoid: non-secure generators can loop indefinitely with negative size. ビルドツール。上記package判断参照。 |
| `nanoid` [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | high | 3.3.15, 3.3.8 | `>=3.3.18` | nanoid: custom generators can loop indefinitely when size is zero. ビルドツール。上記package判断参照。 |
| `postcss` [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | high | 8.5.16 | `>=8.5.18` | PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure. Webビルドツール。上記package判断参照。 |
| `@hono/node-server` [GHSA-9mqv-5hh9-4cgg](https://github.com/advisories/GHSA-9mqv-5hh9-4cgg) | moderate | 2.0.6 | `>=2.0.10` | Node.js Adapter for Hono: Unauthenticated memory-leak DoS via aborted WebSocket handshake. ローカル実行時。上記package判断参照。 |
| `tar` [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) | high | 7.5.7 | `>=7.5.21` | node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection. 配布ツール 優先。上記package判断参照。 |
| `decode-uri-component` [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | moderate | 0.2.2 | `>=0.5.0` | decode-uri-component: Denial of service via exponential decoding of malformed percent-encoded input. Mobile実行時 優先。上記package判断参照。 |
| `browserslist` [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | high | 4.28.4 | `>=4.28.7` | Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM. ビルドツール。上記package判断参照。 |
| `browserslist` [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | high | 4.28.4 | `>=4.28.7` | Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats). ビルドツール。上記package判断参照。 |
| `nanoid` [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) | high | 3.3.8 | `>=3.3.12` | nanoid: Integer Overflow or Wraparound. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-6gmq-8vp8-gcm6](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6) | moderate | 0.9.10 | `>=0.9.12` | xmldom: XML fragment injection via invalid EntityReference.nodeName during requireWellFormed serialization. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-6gmq-8vp8-gcm6](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6) | moderate | 0.7.13, 0.8.13 | `>=0.8.15` | xmldom: XML fragment injection via invalid EntityReference.nodeName during requireWellFormed serialization. ビルドツール。上記package判断参照。 |
| `fast-uri` [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8) | high | 3.1.3 | `>=3.1.6` | fast-uri vulnerable to host confusion via skipped IDN canonicalization on scheme-relative references. Webビルドツール。上記package判断参照。 |
| `fast-uri` [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc) | high | 3.1.3 | `>=3.1.6` | fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization. Webビルドツール。上記package判断参照。 |
| `fast-uri` [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) | high | 3.1.3 | `>=3.1.6` | fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding. Webビルドツール。上記package判断参照。 |
| `fast-uri` [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) | high | 3.1.3 | `>=3.1.6` | fast-uri vulnerable to host confusion via percent-encoded scheme normalization. Webビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-6mj3-qw4j-hgrw](https://github.com/advisories/GHSA-6mj3-qw4j-hgrw) | high | 0.9.10 | `>=0.9.12` | xmldom: HTML raw-text closing-tag case mismatch causes output amplification. ビルドツール。上記package判断参照。 |
| `joi` [GHSA-6w3j-5fw6-r9vr](https://github.com/advisories/GHSA-6w3j-5fw6-r9vr) | low | 17.11.0, 17.13.4 | `>=17.13.6` | joi: Prototype pollution via a `__proto__` language key in custom messages. ビルドツール。上記package判断参照。 |
| `joi` [GHSA-gg4h-3hg2-grpc](https://github.com/advisories/GHSA-gg4h-3hg2-grpc) | low | 17.11.0, 17.13.4 | `>=17.13.5` | joi: object().rename() with a template target can set the validated object's prototype. ビルドツール。上記package判断参照。 |
| `vitest` [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | moderate | 4.1.9 | `>=4.1.11` | Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock. テストツール。上記package判断参照。 |
| `@vitest/mocker` [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | moderate | 4.1.9 | `>=4.1.11` | Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock. テストツール。上記package判断参照。 |
| `baseline-browser-mapping` [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | moderate | 2.10.40 | `>=2.11.0` | baseline-browser-mapping process termination on invalid input causes denial of service. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-g53g-w8rj-fmg7](https://github.com/advisories/GHSA-g53g-w8rj-fmg7) | high | 0.9.10 | `>=0.9.11` | xmldom PI grammar regex ReDoS: quadratic backtracking on unterminated processing instructions. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-w2rr-34g9-rvrj](https://github.com/advisories/GHSA-w2rr-34g9-rvrj) | high | 0.7.13, 0.8.13 | `>=0.8.14` | xmldom: Element name injection via createElement() bypasses requireWellFormed. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-w2rr-34g9-rvrj](https://github.com/advisories/GHSA-w2rr-34g9-rvrj) | high | 0.9.10 | `>=0.9.11` | xmldom: Element name injection via createElement() bypasses requireWellFormed. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-4w3w-2rp5-g8jm](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm) | high | 0.7.13, 0.8.13 | `>=0.8.14` | xmldom: Attribute name injection via setAttribute() bypasses requireWellFormed. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-4w3w-2rp5-g8jm](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm) | high | 0.9.10 | `>=0.9.11` | xmldom: Attribute name injection via setAttribute() bypasses requireWellFormed. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-c7q8-3ch8-vqpv](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv) | high | 0.9.10 | `>=0.9.12` | xmldom: Processing Instruction Target Injection Bypasses requireWellFormed. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-c7q8-3ch8-vqpv](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv) | high | 0.7.13, 0.8.13 | `>=0.8.15` | xmldom: Processing Instruction Target Injection Bypasses requireWellFormed. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-27p8-2357-5qqv](https://github.com/advisories/GHSA-27p8-2357-5qqv) | high | 0.9.10 | `>=0.9.12` | xmldom: DocType `name` Injection Bypasses requireWellFormed. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-27p8-2357-5qqv](https://github.com/advisories/GHSA-27p8-2357-5qqv) | high | 0.7.13, 0.8.13 | `>=0.8.15` | xmldom: DocType `name` Injection Bypasses requireWellFormed. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-3px3-54cx-rmw9](https://github.com/advisories/GHSA-3px3-54cx-rmw9) | high | 0.9.10 | `>=0.9.12` | xmldom: Creation-time XML Name/QName validation is bypassable via an embedded line terminator, allowing injection on the default serialization path. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-vr34-hp96-76pp](https://github.com/advisories/GHSA-vr34-hp96-76pp) | high | 0.9.10 | `>=0.9.12` | xmldom: requireWellFormed DocType publicId/systemId validation is bypassable via an embedded line terminator. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-6h8r-xr42-gp59](https://github.com/advisories/GHSA-6h8r-xr42-gp59) | moderate | 0.9.10 | `>=0.9.12` | xmldom: Parser silently accepts a not-well-formed end tag whose name is followed by a line break and trailing content. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-6h8r-xr42-gp59](https://github.com/advisories/GHSA-6h8r-xr42-gp59) | moderate | 0.7.13, 0.8.13 | `>=0.8.15` | xmldom: Parser silently accepts a not-well-formed end tag whose name is followed by a line break and trailing content. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-8344-3jmq-59r6](https://github.com/advisories/GHSA-8344-3jmq-59r6) | high | 0.9.10 | `>=0.9.12` | xmldom: Quadratic-time attribute deduplication. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-8344-3jmq-59r6](https://github.com/advisories/GHSA-8344-3jmq-59r6) | high | 0.7.13, 0.8.13 | `>=0.8.15` | xmldom: Quadratic-time attribute deduplication. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-x4fp-j954-r2f4](https://github.com/advisories/GHSA-x4fp-j954-r2f4) | high | 0.7.13, 0.8.13 | `>=0.8.15` | xmldom: End-tag Whitespace-Trim Regex ReDoS — quadratic backtracking in the 0.8.x end-tag parser. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-965w-775f-mr7g](https://github.com/advisories/GHSA-965w-775f-mr7g) | high | 0.9.10 | `>=0.9.12` | xmldom: Quadratic-memory consumption. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-965w-775f-mr7g](https://github.com/advisories/GHSA-965w-775f-mr7g) | high | 0.7.13, 0.8.13 | `>=0.8.15` | xmldom: Quadratic-memory consumption. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-93r5-fhx6-vmg9](https://github.com/advisories/GHSA-93r5-fhx6-vmg9) | high | 0.9.10 | `>=0.9.12` | xmldom: Quadratic-time parsing via the malformed-input recovery path — `parseElementStartPart` re-scan and `normalize()` adjacent-text merge. ビルドツール。上記package判断参照。 |
| `@xmldom/xmldom` [GHSA-93r5-fhx6-vmg9](https://github.com/advisories/GHSA-93r5-fhx6-vmg9) | high | 0.7.13, 0.8.13 | `>=0.8.15` | xmldom: Quadratic-time parsing via the malformed-input recovery path — `parseElementStartPart` re-scan and `normalize()` adjacent-text merge. ビルドツール。上記package判断参照。 |
| `sharp` [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | high | 0.35.3 | `>=0.35.4` | sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545. 開発ツール。上記package判断参照。 |
| `js-yaml` [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | high | 3.15.0 | `>=3.15.2` | js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources. ビルドツール。上記package判断参照。 |
| `js-yaml` [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | high | 4.3.0 | `>=4.3.2` | js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources. ビルドツール。上記package判断参照。 |
| `hono` [GHSA-gqvv-2mrq-wpjv](https://github.com/advisories/GHSA-gqvv-2mrq-wpjv) | moderate | 4.12.27 | `>=4.13.5` | Hono: Incomplete fix for CVE-2026-39408: `toSSG()` still writes files outside the output directory. toSSG / hono/ssgの利用なし。該当API利用なし。 |
| `hono` [GHSA-g6gw-c38x-mqfc](https://github.com/advisories/GHSA-g6gw-c38x-mqfc) | moderate | 4.12.27 | `>=4.13.5` | Hono: Unbounded dot-notation nesting in `parseBody()` can cause memory exhaustion. req.parseBodyの利用なし。JSON/Zod経路で、dot option対象外。 |
| `hono` [GHSA-crvj-82cr-hjcx](https://github.com/advisories/GHSA-crvj-82cr-hjcx) | moderate | 4.12.27 | `>=4.13.5` | Hono: Query parser reads parameters after the URL fragment, causing cache-key and proxy interpretation differentials. query利用はあるが、公式advisoryはCloudflare Workersを影響外と明記。Node開発経路は別なので依存更新対象。 |
| `smol-toml` [GHSA-7w5x-hrqm-74c2](https://github.com/advisories/GHSA-7w5x-hrqm-74c2) | high | 1.7.0 | `>=1.7.1` | smol-toml: Denial of Service via malformed TOML documents. 開発ツール。上記package判断参照。 |
| `image-size` [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | high | 1.2.1 | `>=2.0.3` | image-size: JXL and HEIF parsers allow denial of service through infinite loops. Mobileビルドツール。上記package判断参照。 |
| `image-size` [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | high | 1.2.1 | `>=2.0.3` | image-size: ICNS parser allows denial of service through an infinite loop. Mobileビルドツール。上記package判断参照。 |
| `undici` [GHSA-3wwx-pv8p-q78v](https://github.com/advisories/GHSA-3wwx-pv8p-q78v) | moderate | 7.28.0 | `>=7.29.1` | undici vulnerable to Denial of Service via unhandled error in WebSocket permessage-deflate decompression. テストツール。上記package判断参照。 |
| `fast-uri` [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) | high | 3.1.3 | `>=3.1.7` | fast-uri vulnerable to authority injection via an unvalidated port in serialize. Webビルドツール。上記package判断参照。 |
| `undici` [GHSA-pmjh-fq2x-6v4x](https://github.com/advisories/GHSA-pmjh-fq2x-6v4x) | moderate | 7.28.0 | `>=7.29.1` | undici vulnerable to Denial of Service via orphaned RetryHandler response body. テストツール。上記package判断参照。 |
| `undici` [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) | low | 7.28.0 | `>=7.29.1` | undici vulnerable to downstream response splitting via retry interceptor. テストツール。上記package判断参照。 |
| `undici` [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5) | high | 7.28.0 | `>=7.29.1` | undici vulnerable to Denial of Service via unrequested WebSocket subprotocol. テストツール。上記package判断参照。 |
| `undici` [GHSA-3xpg-4rpp-hhhm](https://github.com/advisories/GHSA-3xpg-4rpp-hhhm) | moderate | 7.28.0 | `>=7.29.1` | undici vulnerable to Denial of Service via unbounded decompression of compressed responses. テストツール。上記package判断参照。 |
| `undici` [GHSA-2jfj-6hjv-fm6j](https://github.com/advisories/GHSA-2jfj-6hjv-fm6j) | moderate | 7.28.0 | `>=7.29.1` | undici vulnerable to cross-user cookie disclosure via Set-Cookie caching in shared caches. テストツール。上記package判断参照。 |
| `undici` [GHSA-2gqq-gqf2-x968](https://github.com/advisories/GHSA-2gqq-gqf2-x968) | low | 7.28.0 | `>=7.29.1` | undici vulnerable to response truncation via oversized chunked responses in the dump interceptor. テストツール。上記package判断参照。 |
| `undici` [GHSA-w293-vg96-wgc3](https://github.com/advisories/GHSA-w293-vg96-wgc3) | high | 7.28.0 | `>=7.29.1` | undici vulnerable to TLS certificate validation bypass via dropped connect options in BalancedPool. テストツール。上記package判断参照。 |
| `undici` [GHSA-8436-99hf-9mmv](https://github.com/advisories/GHSA-8436-99hf-9mmv) | low | 7.28.0 | `>=7.29.1` | undici vulnerable to caching and replay of unsafe HTTP method responses. テストツール。上記package判断参照。 |
| `undici` [GHSA-rx4f-c7p8-82vq](https://github.com/advisories/GHSA-rx4f-c7p8-82vq) | moderate | 7.28.0 | `>=7.29.1` | undici vulnerable to Denial of Service via WebSocketStream unclean close. テストツール。上記package判断参照。 |
| `joi` [GHSA-6h2x-m376-mqjq](https://github.com/advisories/GHSA-6h2x-m376-mqjq) | high | 17.11.0, 17.13.4 | `>=17.13.7` | joi: Quadratic regular-expression backtracking in `Joi.string().isoDate()`. ビルドツール。上記package判断参照。 |
| `fast-uri` [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) | moderate | 3.1.3 | `>=3.1.8` | fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets. Webビルドツール。上記package判断参照。 |
| `moment` [GHSA-4p3w-j4w9-5jqw](https://github.com/advisories/GHSA-4p3w-j4w9-5jqw) | moderate | 2.30.1 | `>=2.31.0` | moment vulnerable to Path Traversal via crafted non-string locale name. 開発ツール。上記package判断参照。 |
| `brace-expansion` [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | 1.1.16 | `>=1.1.21` | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | 2.1.1 | `>=2.1.7` | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | 5.0.7 | `>=5.0.12` | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | 1.1.16 | `>=1.1.20` | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | 2.1.1 | `>=2.1.6` | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | 5.0.7 | `>=5.0.11` | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | 1.1.16 | `>=1.1.19` | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | 2.1.1 | `>=2.1.5` | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion. ビルドツール。上記package判断参照。 |
| `brace-expansion` [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | 5.0.7 | `>=5.0.10` | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion. ビルドツール。上記package判断参照。 |

## 評価上の限界

Workers、ローカルNode、Mobile JS、ビルド・テストの境界はrepositoryのimport・依存・実装から判断した。外部入力に対するすべての推移的呼び出しを動的に再現したものではない。影響なしとした利用APIを将来追加する場合は再評価する。更新前の一次評価だけではaudit件数は減らない。後続の更新結果は冒頭の「修正結果」を参照。

## 更新後の検証メモ

`pnpm install --frozen-lockfile`成功。3箇所の互換patchは専用テストで確認し、ExpoのiOS/Android両方のJS exportも成功。EASの設定マージとDrizzle configの読み込みも確認した。

`drizzle-kit check`は終了コード0だが、既存migration journalの0031の時刻が0030より古いとの警告を出す。これは今回変更していない履歴で、既存DBの適用状況を調べずに時刻を書き換えると再適用リスクがあるため変更していない。新規の隔離DBで全migrationが成功することと、0030で止まった既存DBから0031が適用されることは別の検証になる。本番migrationは実行していない。

通常のci-checkのVitest実行はRosettaの`target for 19-bit branch is out-of-range`で停止したため、そのプロセスを終了。fork poolを使って同じ全test suiteを再検証し、guard・lint・型チェックは個別に実行した。全319ファイル中318 passed / 1 skipped、3,007 tests passed / 2 skipped。Web entitlement E2Eは5 passed。guard、lint、Web/Admin/Mobileの型チェックも成功。
