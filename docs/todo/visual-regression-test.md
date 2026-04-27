# ビジュアル回帰テスト導入

> 対象: `e2e/web/`, 将来的に `apps/mobile` (React Native Web経由)

## 背景

- 4/21 authState 全置換で tutorialStatus が消失した Critical バグはレビューで発見、自動検知できなかった
- 4/25 notes 既存テスト破壊を着手前に検出できなかった
- 「ブラウザ確認した」のマニュアル運用が品質 4.0 の頭打ちになっている
- AIエージェント並列開発のスケールに対して人間目視はスケールしない
- スクリーンショット差分があれば、エージェントが「画面が変わったか」を機械的にフィードバックでき、debug 往復が減る

## ゴール

- PR で主要画面の screenshot diff が CI 上で出る
- 意図しない画面変化が CI で fail する
- 過去のリグレッション事例（authState全置換、notes破壊）が後追いテストで検知できる

## 方針

- Playwright `toHaveScreenshot()` を採用（既存 e2e 基盤に追加。Chromatic等の外部SaaSは不要）
- baseline は repo にコミット（GitHub LFS は当面不要、画像点数次第で再検討）
- フォント/レンダリング差を消すため Linux Docker での実行を baseline とする
- Web 先行、Mobile は React Native Web 経由で後段

---

## Phase 1: PoC（5画面）

- [ ] 既存 `e2e/web/*.spec.ts` から代表シナリオを5本選定（Actiko / Goal / Task / Note / Login）
- [ ] 選定シナリオに `await expect(page).toHaveScreenshot()` を追加
- [ ] `playwright.config.ts` の `expect` に `toHaveScreenshot: { threshold: 0.2, maxDiffPixels: 100, animations: 'disabled' }` を設定
- [ ] アニメーション・カーソル点滅・日時表示など非決定要素を mask する設定追加
- [ ] WSL/CI/ローカル間のレンダリング差を確認、必要なら playwright Docker image でCIを統一
- [ ] baseline を `e2e/web/__screenshots__/` 配下にコミット
- [ ] CSS をわざと変更して diff が出ること、戻すと一致することを確認

## Phase 2: Web 主要画面拡張

- [ ] Actiko 画面（活動あり / なし）
- [ ] Actiko 画面（目標あり / なし）
- [ ] 記録モード別画面: manual, timer, counter, binary, numpad
- [ ] Goal 詳細・達成度バー画面
- [ ] Task 一覧（active / archived）
- [ ] Note 一覧 / 詳細
- [ ] サブスクリプション画面（free / premium 状態別）
- [ ] 設定画面
- [ ] 認証画面（Login / Register / PasswordReset）
- [ ] チュートリアルモード各ステップ
- [ ] エラーステート（オフライン / 同期失敗インジケータ）

## Phase 3: CI 統合

- [ ] PR check に screenshot 比較ジョブ追加
- [ ] diff 検出時に PR コメントで画像表示（`actions/upload-artifact` + 比較ビューア）
- [ ] baseline 更新フローを文書化（`pnpm run e2e:update-snapshots` コマンド整備）
- [ ] 意図的変更時の baseline 更新を PR に含めるルールを `.claude/rules/` に追加
- [ ] `/browser-check` skill に「screenshot diff の解釈方法」を追記

## Phase 4: Mobile（React Native Web 経由）

- [ ] `apps/mobile` の主要画面を React Native Web で起動可能か検証
- [ ] 起動可能なら Web と同様の screenshot 比較を追加
- [ ] iOS/Android production と RN Web のレンダリング乖離を許容する旨を ADR 化
- [ ] Mobile-only 機能（ウィジェット連携、ネイティブモーダル）はスコープ外と明記

## Phase 5: AIエージェント連携

- [ ] `parallel-agents.md` に「UI変更を伴うエージェントは Phase 完了後に screenshot diff を確認する」を追加
- [ ] エージェント完了報告テンプレートに「screenshot diff: 0 件 / N 件」フィールド追加
- [ ] diff があった時のエージェント側のトリアージ手順を整備（意図的 / 不本意の判定）

---

## 受け入れ条件

- [ ] 主要15画面以上で screenshot 比較が動いている
- [ ] PR で意図しない画面変化が CI で fail する
- [ ] 過去の authState 全置換 / notes 破壊 を branch 戻しで再現し、screenshot diff で検知できることを確認

## 非ゴール

- ピクセル完全一致は求めない（threshold 設定で運用）
- React Native production ビルドの screenshot は対象外
- Visual regression を品質保証の唯一の手段にしない（unit/E2E と併用）

## 関連

- ADR: 後で `docs/adr/` に「visual-regression-strategy.md」を起こす
- 既存基盤: `e2e/web/`, `playwright.config.ts`, `vitest.e2e.config.ts`
