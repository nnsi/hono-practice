# 原子的なレート制限とAIクォータ（不採用）

## ステータス

不採用（2026-07-14）。[`20260215_do_to_kv_ratelimit.md`](./20260215_do_to_kv_ratelimit.md)のWorkers KV採用を継続する。

## コンテキスト

以前のKV採用判断では、計測されたDurable Objectの500〜1,000msのコールドスタートコストを最適化し、小規模な個人向けアプリケーションで結果整合性のカウンターを許容していた。2026-07-13には、同じ境界が有料AI利用量、APIキー単位のクォータ、OpenRouterへの同時リクエストも保護することから、厳密な原子性を要求する案を検討した。Workers KVのread-modify-writeでは、同時リクエストが1つのスロットを厳密に一度だけ消費することは保証できない。

一方、現在のAI呼び出しは単価が低く、数件の超過による費用は限定的である。DOを採用すると、認証やAI操作の通常経路へ既知のコールドスタート遅延を再導入する。レート制限の多くも金融台帳ではなく、botや総当たりを減速させる多層防御であり、厳密な上限による便益は小さい。

## 決定事項

Durable Objectは採用せず、CloudflareへのデプロイではWorkers KVを使用する。Node実行環境ではRedis、テストではインメモリアダプターを使用する。本番環境とstaging環境では、ストアが未設定または読み取り不能な場合にfail-closeする。

アプリケーション層が所有するportでカウンター消費を定義し、上位層をストレージ製品から分離する。ただし、portは全アダプターにグローバルな原子性を要求しない。Workers KVでは結果整合性を持つsoft limit、RedisではLuaスクリプトによるより強い保証として実装できる。

各カウンター群は明示的な`partitionKey`を持ち、すべてのアダプターは同じ`(partitionKey, rule.key)`の組でカウンターを識別する。このキー契約は維持する一方、Workers KVで複数ルールがall-or-nothingに更新されるとは扱わない。

AIのユーザー単位およびAPIキー単位の分・日・直近30日クォータをsoft limitとして扱う。KVで正確に保証できない同時実行数の制御は行わず、金銭上のhard capはOpenRouter等のprovider側の予算上限と利用量アラートで管理する。

## 結果

- 同時バーストではrate limitとquotaを超過する可能性を残存リスクとして受容する。
- Workers KVの同一キー書き込みは毎秒1回までであり、短時間の連続要求では非同期`put`が失敗してカウンターが進まない場合がある。その要求はsoft limitとして許可済みのままとし、構造化エラーをWAEで監視する。
- DOのコールドスタートを通常のリクエスト経路へ再導入しない。
- `RateLimitDurableObject`と`RATE_LIMITER` bindingは追加せず、既存のWorkers KV namespaceと`RATE_LIMIT_KV_NS` bindingを継続利用する。
- WAEではKVのエラー・レイテンシと拒否件数を、provider側では実利用額を監視する。
- 実際の不正利用、予算超過、下流サービスの厳密な同時実行制約が観測された場合に限り、影響する経路だけをDO化する。
- 将来、汎用キャッシュを追加する場合は、その用途専用のアプリケーション層のportと整合性契約を定義する。rate limit用portを汎用キャッシュとして流用しない。
- 制限値の根拠は[Cloudflare Workers KVの制限](https://developers.cloudflare.com/kv/platform/limits/)を参照する。
