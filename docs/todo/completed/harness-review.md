# Harness Engineering 適応度分析レポート

> 2026-03-28 作成
> ソース: X投稿にキュレーションされた20本以上のHarness Engineering記事を読み込み、本リポジトリの適応度を分析

## 評価基準

- ★★★★★ 業界最先端レベル
- ★★★★☆ 十分に実践されている
- ★★★☆☆ 基本は押さえているが改善余地あり
- ★★☆☆☆ 部分的にのみ対応
- ★☆☆☆☆ ほぼ未対応

## 総合スコア

| # | 観点 | スコア |
|---|------|--------|
| 1 | Documentation & Knowledge Architecture | ★★★★☆ |
| 2 | Architectural Constraints & Enforcement | ★★★★☆ |
| 3 | Hooks & Deterministic Verification | ★★★★★ |
| 4 | Feedback Loops & Back-Pressure | ★★★★☆ |
| 5 | Context Engineering | ★★★★☆ |
| 6 | Application Observability & Legibility | ★★★☆☆ |
| 7 | Agent Architecture & Orchestration | ★★★☆☆ |
| 8 | Session & State Management | ★★★☆☆ |
| 9 | Verification & Quality Assurance | ★★★★☆ |
| 10 | Skills & Reusable Workflows | ★★★★★ |
| 11 | Garbage Collection & Entropy Management | ★★☆☆☆ |
| 12 | Tooling & Environment Design | ★★★★☆ |
| 13 | Human-Agent Collaboration Model | ★★★★☆ |
| 14 | Harness Lifecycle & Rippable Design | ★★☆☆☆ |

**平均: 3.5 / 5.0**

---

## 1. Documentation & Knowledge Architecture ★★★★☆

**観点**: AGENTS.md/CLAUDE.mdをエントリポイントとし、リポジトリを唯一の情報源とする。50-100行のポインタ設計、Progressive Disclosure、ADRによる意思決定記録。

| 項目 | 状態 | 根拠 |
|------|------|------|
| CLAUDE.md階層構造 | ✅ | Root(59行) + backend(22) + frontend(65) + mobile(11) + diary(8) |
| ポインタ設計 | ✅ | Root CLAUDE.mdが`docs/knowledges/`や各app CLAUDEを参照 |
| docs/構造化 | ✅ | ADR(5件), design, knowledges(6件), ops, diary(90+件) |
| Living Documentation | ✅ | 日記システムが失敗・学びを蓄積、MEMORY.mdが教訓を永続化 |
| 外部サイロ排除 | ✅ | Slack/Google Docsではなくrepo内ドキュメントに集約 |

**改善余地**: frontend CLAUDE.mdが65行とやや長い。nyosegawa記事の推奨は50行以内。一部をrules/に分離するとContext Window効率が向上する可能性。

---

## 2. Architectural Constraints & Enforcement ★★★★☆

**観点**: 厳密なレイヤー依存関係、カスタムリンターによる修正指示付きエラー、構造テスト、Taste Invariants（命名・ファイルサイズ等）の機械的強制。

| 項目 | 状態 | 根拠 |
|------|------|------|
| レイヤードアーキテクチャ | ✅ | route→handler→usecase→repository（backend CLAUDE.md） |
| レイヤー境界のリンター強制 | ✅ | biome.json: `@backend/*`→`@packages`からの参照禁止、逆方向も禁止 |
| Taste Invariants | ✅ | 200行制限(post-lint.js)、`type`強制(`interface`禁止)、`confirm()`/`alert()`禁止、命名規約(`newXXX`) |
| Import秩序 | ✅ | biome.jsonのorganizeImportsで6段階のimport順序を強制 |
| Boring Technology | ✅ | Hono, React, Postgres, pnpm — 安定・訓練データ豊富なスタック |

**改善余地**: リンターのエラーメッセージに「修正方法」を含める点はpost-lint.jsのhint機能で部分的に実装済みだが、OpenAI記事が推奨する「エラーメッセージ自体にremediation instructionを埋め込む」レベルには達していない。biome自体のカスタムルール追加を検討できる。

---

## 3. Hooks & Deterministic Verification ★★★★★

**観点**: PreToolUse/PostToolUse/SessionStart/PreCompactなどライフサイクルフックで、安全ゲート・自動フォーマット・フィードバック注入を実現。

| 項目 | 状態 | 根拠 |
|------|------|------|
| PreToolUse安全ゲート | ✅ | `block-manual-ddl.sh` — DDLを検出しdrizzle-kit以外をブロック |
| PostToolUse自動修正 | ✅ | `post-lint.js` — biome format + lint --fix自動実行 |
| PostToolUse規約チェック | ✅ | `post-lint.js` — interface検出, 200行超, confirm()検出, vitest import検出 |
| PostToolUse意識チェック | ✅ | `diary-unsaid-check.js` — 日記の「言わなかった」パターン検出→即時警告 |
| SessionStart環境初期化 | ✅ | `session-start.sh` — リモート環境でpnpm install + Playwright |
| PreCompactログ保存 | ✅ | `pre-compact.js` — セッションログをdiary-cc-logs/に退避 |
| 構造化JSON出力 | ✅ | `hookSpecificOutput.additionalContext`形式でエージェントにフィードバック |

**評価**: このリポジトリのHooks設計は記事群が推奨するベストプラクティスをほぼ完全に実装している。特に`diary-unsaid-check.js`は他のどの記事にも見られない独自のアカウンタビリティ機構で、「Humans on the Loop」モデルの先進的実装。

---

## 4. Feedback Loops & Back-Pressure ★★★★☆

**観点**: 型チェック→リンター→ユニットテスト→E2Eの多段パイプライン。成功は飲み込み、失敗のみ表面化。3-strike escalation。

| 項目 | 状態 | 根拠 |
|------|------|------|
| 多段検証パイプライン | ✅ | `test-once` → `tsc` → `fix` → `ci-check` |
| 即時フィードバック | ✅ | PostToolUse hookがファイル編集直後に発火 |
| 成功飲み込み/失敗表面化 | ✅ | post-lint.jsは違反時のみ出力 |
| CI/CDゲート | ✅ | pr.yml: lint + typecheck + test + build |
| 3-strike escalation | ❌ | 明示的なルールなし |

**改善余地**: nogataka記事の「3回同じ違反→ドキュメントからhook/linterへ昇格」ルールは未導入。diary/MEMORYで教訓は蓄積しているが、「エスカレーション閾値」が形式化されていない。

---

## 5. Context Engineering ★★★★☆

**観点**: コンテキスト量の最適化、Progressive Disclosure、サブエージェントによるコンテキスト分離、Instruction Budget意識。

| 項目 | 状態 | 根拠 |
|------|------|------|
| CLAUDE.md簡潔さ | ✅ | Root 59行（推奨50-100行の範囲内） |
| スコープ付きルール | ✅ | `.claude/rules/`で関心事分離 |
| Skills（遅延ロード） | ✅ | 8+スキルが必要時のみコンテキストに注入 |
| サブエージェント戦略 | ✅ | `parallel-agents.md`で排他制御・直列/並列の使い分けを文書化 |
| Memory（永続化） | ✅ | MEMORY.mdインデックス + 個別ファイル |
| コンテキスト過積載防止 | △ | 明示的な「Instruction Budget」計測はしていない |

**改善余地**: HumanLayer記事が警告する「Dumb Zone問題」（コンテキスト増加→性能低下）への明示的な対策がない。CLAUDE.mdのトークン数モニタリングや、Skills/Rulesの定期的な棚卸しプロセスが有効。

---

## 6. Application Observability & Legibility ★★★☆☆

**観点**: ローカル観測スタック（LogQL/PromQL/TraceQL）、OpenTelemetry統合、ブラウザ自動化、Git Worktreeごとの隔離環境。

| 項目 | 状態 | 根拠 |
|------|------|------|
| サーバーログ | ✅ | WAE (Workers Analytics Engine) + `wae-apm`スキル |
| クライアントエラー収集 | ✅ | `errorReporter.ts` → backend → WAE |
| ブラウザ自動化 | ✅ | Chrome MCP + Playwright CLI (2つのスキル) |
| APMクエリ能力 | ✅ | SQLベースでエンドポイント別、5xx、遅延分析可能 |
| OpenTelemetry | ❌ | WAEはCloudflare独自。標準的なOTLP→Traces統合なし |
| ローカル観測スタック | ❌ | OpenAI記事のVictoria Logs/Metrics/Traces相当がない |
| Worktreeごとの隔離観測 | ❌ | worktree機能はあるがアプリ・観測の隔離起動はなし |

**改善余地**: OpenAI記事の核心「エージェントが自律的にログを検索してバグ特定→修正→再起動→検証」ループにはOTLP統合が必要。Cloudflare環境では難しいが、ローカル開発時のdocker compose観測スタック追加は検討の価値あり。

---

## 7. Agent Architecture & Orchestration ★★★☆☆

**観点**: マルチエージェント分離（Planner/Generator/Evaluator）、エージェント間レビュー、難易度ルーティング、ループ検出。

| 項目 | 状態 | 根拠 |
|------|------|------|
| 並列エージェント戦略 | ✅ | `parallel-agents.md`で排他制御・直列優先事項を定義 |
| エージェント間レビュー | ✅ | `review-cycle`スキル（サブエージェント + Codex並列） |
| セキュリティコード保護 | ✅ | 「署名検証等はエージェントに丸投げしない」明記 |
| 難易度ルーティング | ❌ | Zenn記事のEasy/Medium/Hard自動振り分けなし |
| ループ検出 | ❌ | LangChain記事のper-fileエディット回数追跡なし |
| ローカルオーケストレーター | ❌ | Zenn記事のorchestate.tsのような自動パイプラインなし |
| Explore→Implement分離 | ❌ | 読み取り専用フェーズの強制はなし |

**改善余地**: 現在は人間がオーケストレーターを兼ねている。Zenn記事のExploreフェーズ（コード変更禁止でまず調査→結果を実装プロンプトに注入）はターン数削減に有効とされており、parallel-agents.mdに組み込む価値がある。

---

## 8. Session & State Management ★★★☆☆

**観点**: コンテキストリセット vs 圧縮戦略、セッション起動プロトコル、JSON形式のProgress File、Git履歴をメモリブリッジとして使用。

| 項目 | 状態 | 根拠 |
|------|------|------|
| セッションログ保存 | ✅ | PreCompact hookが自動退避 |
| Memory永続化 | ✅ | MEMORY.md + 個別ファイル |
| 日記システム | ✅ | diary/に90+エントリ |
| Git履歴活用 | ✅ | parallel-agents.mdで「agent output不信→git確認」を推奨 |
| セッション起動プロトコル | △ | session-start.shは環境初期化のみ。Anthropic記事の「pwd確認→git log読み→次タスク選択」プロトコルは未定義 |
| Progress File (JSON) | ❌ | 構造化された進捗ファイルなし |
| Feature List File | ❌ | 機能一覧とpass/failステータスの管理なし |

**改善余地**: 日本語記事の知見「JSONはMarkdownより壊れにくい」を踏まえ、長期タスクの進捗管理にはJSON形式の進捗ファイルが有効。SessionStartフックにonboarding手順（直前セッションのgit log表示など）を追加すると、セッション間の文脈喪失を軽減できる。

---

## 9. Verification & Quality Assurance ★★★★☆

**観点**: 自己検証ループ、Pre-Completionチェックリスト、E2Eブラウザテスト、グレーディング基準。

| 項目 | 状態 | 根拠 |
|------|------|------|
| ブラウザ検証手順 | ✅ | `browser-check`スキルで5ステップ標準化 |
| 「表示≠動作」原則 | ✅ | スキルに明記。CRUD操作を実際にテスト |
| モバイルビューポート | ✅ | 375x812チェック義務化 |
| 完了の定義 | ✅ | CLAUDE.mdにUI/DB/Web+Mobile検証を明記 |
| E2Eテスト基盤 | ✅ | Playwright + vitest.e2e.config.ts |
| Pre-Completionチェックリスト | ❌ | LangChain記事のmiddlewareによる強制チェックなし |
| 品質グレーディング | ❌ | Anthropic記事のDesign Quality/Originality/Craft/Functionality評価軸なし |

**改善余地**: 「完了の定義」はドキュメントレベルで定義されているが、Hookレベルでの強制（Stop前に自動チェックリスト実行など）はない。LangChain記事の`PreCompletionChecklistMiddleware`相当を実装すれば、エージェントの「完了しました」宣言の信頼性が向上する。

---

## 10. Skills & Reusable Workflows ★★★★★

**観点**: 再利用可能な手続きテンプレート、コードスキャフォールディング、デプロイ・レビューワークフロー。

| 項目 | 状態 | 根拠 |
|------|------|------|
| スキル数・多様性 | ✅ | 9スキル: codex, eas-build, scaffold, review-cycle, browser-check, ota-update, playwright-cli, write-diary, wae-apm |
| コード生成 | ✅ | `generate-domain.js`, `generate-feature.js` — パターン準拠のボイラープレート自動生成 |
| デプロイワークフロー | ✅ | eas-build, ota-update — 手順・注意事項・環境変数を全てスキルに内包 |
| レビューワークフロー | ✅ | review-cycle — 2レビュアー並列、LGTM until convergence |
| 観測ワークフロー | ✅ | wae-apm — SQLクエリ生成→レポート出力 |

**評価**: スキルの充実度は記事群のどの実例よりも豊富。特にreview-cycleの「レビュアー特性の文書化（サブエージェント=設計一貫性に強い、Codex=エッジケースに強い）」は他記事に見られない実践的な知見。

---

## 11. Garbage Collection & Entropy Management ★★☆☆☆

**観点**: 定期クリーンアップエージェント、陳腐化ドキュメント検出、品質グレードスキャン、auto-fixable分類。

| 項目 | 状態 | 根拠 |
|------|------|------|
| 編集時の規約チェック | ✅ | post-lint.jsがリアルタイムで検出 |
| 日記アカウンタビリティ | ✅ | diary-unsaid-check.jsがパターン検出 |
| 定期クリーンアップエージェント | ❌ | OpenAI記事の「daily refactoring PRs」相当なし |
| 陳腐化ドキュメント検出 | ❌ | ドキュメントと実態の乖離を自動検出する仕組みなし |
| 品質グレードシステム | ❌ | ファイル/モジュール単位の品質スコアなし |
| 週次品質スキャン | ❌ | Zenn記事の「12項目週次スキャン + autoFixable分類」相当なし |
| 月次GC | ❌ | 定期的な大規模クリーンアップジョブなし |

**改善余地**: これが最大のギャップ。OpenAI・Fowler・Zenn記事が共通して強調する「エージェントは既存パターンを複製する — 悪いパターンも」問題に対し、現在は人間が気づいた時に手動対処するのみ。定期スキャンの導入が最もROIの高い改善になりうる。

---

## 12. Tooling & Environment Design ★★★★☆

**観点**: ツール公開（MCP/CLI）、隔離環境、初期化スクリプト、権限境界。

| 項目 | 状態 | 根拠 |
|------|------|------|
| ブラウザMCP | ✅ | Chrome MCP統合 |
| バックアップツール | ✅ | Playwright CLI（MCP不可時用） |
| 外部レビューCLI | ✅ | Codex CLI統合 |
| 環境初期化 | ✅ | session-start.sh |
| 権限境界 | ✅ | block-manual-ddl, deploy承認ゲート |
| CLI > MCP効率 | △ | Chrome MCPを主、Playwright CLIを副としているが、HumanLayer記事の「CLIの方がコンテキスト効率4倍」知見は未反映 |

---

## 13. Human-Agent Collaboration Model ★★★★☆

**観点**: 「Humans on the Loop」モデル、Agentic Flywheel、エージェント出力への不信、意見表明の義務化。

| 項目 | 状態 | 根拠 |
|------|------|------|
| "On the Loop"設計 | ✅ | 人間が方針決定、エージェントが実行、Hook/CI/Skillが品質保証 |
| エージェント出力不信 | ✅ | 「エージェントの完了報告は信用しない」明記 |
| 意見表明義務 | ✅ | response-style.md「異論は黙らず言う」+ diary-unsaid-check |
| 方針判断は人間 | ✅ | 「許容」「対応不要」を勝手に判定しない、明記 |
| Agentic Flywheel | △ | 日記でフィードバック蓄積→CLAUDE.md改善のサイクルはあるが、エージェント自身がハーネス改善を提案→人間承認→実装のループは形式化されていない |

---

## 14. Harness Lifecycle & Rippable Design ★★☆☆☆

**観点**: ハーネス要素の定期的な必要性再検証、モデルアップグレード時の見直し、「剥がせる設計」。

| 項目 | 状態 | 根拠 |
|------|------|------|
| 反復的改善の実績 | ✅ | 日記90+エントリに設計変更の軌跡 |
| フィードバック→ルール昇格 | ✅ | MEMORY.mdの「CLAUDE.mdに昇格済みのルール」が実例 |
| 明示的な棚卸しプロセス | ❌ | 「このHook/Ruleはまだ必要か」の定期レビューなし |
| モデルアップグレード対応 | ❌ | 新モデルリリース時のハーネス再検証プロセスなし |
| 剥がせる設計原則 | ❌ | Anthropic記事の「一つずつ外して必要性を確認」原則が未導入 |

---

## 所見

### 強み（業界水準を超えている点）

- **Hooks設計**は記事群のベストプラクティスをほぼ完全に実装。特に`diary-unsaid-check.js`はどの記事にも登場しない独自機構
- **Skills**の数・多様性・実用性は記事群のどの実例より充実
- **review-cycle**のレビュアー特性文書化は実運用から得られた知見で、記事群が理論的に語るAgent-to-Agent Reviewの先を行っている
- **「エージェント出力不信」原則**の明文化と、diary-unsaid-checkによる強制は、Fowler記事の「Humans on the Loop」の先進的実装

### 最大のギャップ3つ

1. **Garbage Collection（定期クリーンアップ）**: 全記事が強調する「エージェントは悪いパターンも複製する」問題への体系的対策がない。週次品質スキャン + autoFixable分類の導入が最もROI高い
2. **Observability**: WAE APMは稼働中だが、OpenAI記事が核心とするエージェントによる自律的なログ検索→バグ特定→修正ループにはOTLP統合が必要
3. **Harness Lifecycle**: 90+の日記エントリが示すように有機的に進化してきたが、「このルールはまだ必要か」「新モデルで不要になった制約はないか」の定期棚卸しが形式化されていない

---

## 参照記事一覧

### 英語一次記事
- [Harness engineering: leveraging Codex in an agent-first world (OpenAI, 2026/2)](https://openai.com/index/harness-engineering/)
- [Harness Engineering (Martin Fowler, 2026/2)](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)
- [Harness design for long-running application development (Anthropic, 2026/3)](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Effective harnesses for long-running agents (Anthropic, 2025/11)](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [The Emerging "Harness Engineering" Playbook (Artificial Ignorance, 2026/2)](https://www.ignorance.ai/p/the-emerging-harness-engineering)
- [Harness Engineering: The Missing Layer Behind AI Agents (Louis-Francois Bouchard, 2026/3)](https://www.louisbouchard.ai/harness-engineering/)
- [Improving Deep Agents with harness engineering (LangChain, 2026/2)](https://blog.langchain.com/improving-deep-agents-with-harness-engineering/)

### 英語補足記事
- [My AI Adoption Journey (Mitchell Hashimoto, 2026/2)](https://mitchellh.com/writing/my-ai-adoption-journey)
- [Skill Issue: Harness Engineering for Coding Agents (HumanLayer, 2026/3)](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents)
- [The importance of Agent Harness in 2026 (Philipp Schmid, 2026/1)](https://www.philschmid.de/agent-harness-2026)
- [Harness Engineering vs Context Engineering (Rick Hightower, 2026/3)](https://pub.spillwave.com/harness-engineering-vs-context-engineering-the-model-is-the-cpu-the-harness-is-the-os-51b28c5bddbb)
- [How I think about Codex (Simon Willison, 2026/2)](https://simonwillison.net/2026/Feb/22/how-i-think-about-codex/)
- [Humans and Agents in Software Engineering Loops (Martin Fowler, 2026/3)](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html)
- [Context Engineering for Coding Agents (Martin Fowler, 2026)](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)

### 日本語記事
- [ハーネスエンジニアリング入門 (Qiita, 2026/3)](https://qiita.com/nogataka/items/d1b3fcf355c630cd7fc8)
- [Harness Engineeringベストプラクティス (nyosegawa, 2026/3)](https://nyosegawa.com/posts/harness-engineering-best-practices-2026/)
- [ハーネスエンジニアリング x ローカルオーケストレーター (Zenn, 2026/3)](https://zenn.dev/explaza/articles/6c976d79c094dc)
- [OpenAIが実践するAgent-First時代の開発アプローチ (Zenn, 2026/2)](https://zenn.dev/jiro526/articles/harness-engineering)
- [ハーネスエンジニアリング - Martin Fowlerの批評から再考する (Qiita, 2026/3)](https://qiita.com/Aochan0604/items/306bde3e138ce071f7b2)
- [Claude Codeを「最小構成」で飼い慣らす (note, 2026/3)](https://note.com/m2ai_jp/n/na3869c615096)

---

## 改善実施内容（2026-03-28）

### 実施した改善（11件）

| # | 改善 | 主な成果物 | 対応観点 |
|---|------|-----------|----------|
| 1 | 週次品質スキャン + autoFixable分類 | `scripts/quality-scan.js` | Garbage Collection |
| 2 | Explore→Implement分離 | `rules/parallel-agents.md` 追記 | Agent Orchestration |
| 3 | ループ検出Hook | `hooks/loop-detection.js` | Agent Orchestration |
| 4 | Remediation Instructions拡充 | `hooks/post-lint.js` hints 6→14 | Architectural Constraints |
| 5 | 陳腐化ドキュメント検出 | #1に統合 | Garbage Collection |
| 6 | Agentic Flywheel | `rules/agentic-flywheel.md` | Human-Agent Collaboration |
| 7 | 3-strike escalation | `scripts/quality-scan-recurring.js` | Feedback Loops |
| 8 | frontend CLAUDE.md分割 | 65→24行 + 3 scoped rules | Context Engineering |
| 9 | ローカルObservability | `localLogWriter.ts`, `waeWriter.ts`, `skills/local-logs/` | Observability |
| 10 | Harness棚卸しプロセス | `rules/harness-lifecycle.md` | Harness Lifecycle |
| 11 | Session Context通知 | `hooks/session-context.js` | Session Management |

### 改善後スコア

| # | 観点 | Before | After | 変化 |
|---|------|--------|-------|------|
| 1 | Documentation & Knowledge Architecture | ★★★★☆ | ★★★★★ | +1 |
| 2 | Architectural Constraints & Enforcement | ★★★★☆ | ★★★★★ | +1 |
| 3 | Hooks & Deterministic Verification | ★★★★★ | ★★★★★ | — |
| 4 | Feedback Loops & Back-Pressure | ★★★★☆ | ★★★★★ | +1 |
| 5 | Context Engineering | ★★★★☆ | ★★★★★ | +1 |
| 6 | Application Observability & Legibility | ★★★☆☆ | ★★★★☆ | +1 |
| 7 | Agent Architecture & Orchestration | ★★★☆☆ | ★★★★☆ | +1 |
| 8 | Session & State Management | ★★★☆☆ | ★★★★☆ | +1 |
| 9 | Verification & Quality Assurance | ★★★★☆ | ★★★★☆ | — |
| 10 | Skills & Reusable Workflows | ★★★★★ | ★★★★★ | — |
| 11 | Garbage Collection & Entropy Management | ★★☆☆☆ | ★★★★☆ | +2 |
| 12 | Tooling & Environment Design | ★★★★☆ | ★★★★☆ | — |
| 13 | Human-Agent Collaboration Model | ★★★★☆ | ★★★★★ | +1 |
| 14 | Harness Lifecycle & Rippable Design | ★★☆☆☆ | ★★★★☆ | +2 |

**平均: 3.5 → 4.4 / 5.0**（★5: 2→7個、★2以下: 2→0個）

### 意図的にスキップした項目

- **Pre-Completionチェックリスト**: Claude Codeが毎回`test-once → tsc → fix`を実行するため不要
- **SessionStart Onboarding**: セッション間に文脈を残さない方針。compactログの存在通知のみで十分
- **OTLP統合**: Cloudflare Workers環境の制約。ローカルはlocalLogWriterでカバー
- **難易度ルーティング / ローカルオーケストレーター**: 現時点では人間がオーケストレーターを兼ねる運用で十分

### Instruction Surface変化

| 指標 | Before | After | 変化 |
|------|--------|-------|------|
| 常時ロード行数 | 237行 | 195行 | -18% |
| 常時ロードbullets | 110個 | 84個 | -24% |

frontend固有ルール（約40行分）はglobs付きrules/に移行し、frontendファイル編集時のみロードされる。
