# Actiko Mobile UI ガイドライン準拠レポート

調査日: 2026-03-30
対象: `apps/mobile/` (React Native + Expo 55 + NativeWind)
コンポーネント数: 112 / 総行数: 約11,485行

---

## 調査対象ガイドライン

- **Apple Human Interface Guidelines (HIG)** — iOS/iPadOS向け
- **Google Material Design 3 (M3)** — Android向け
- **WCAG 2.2** — アクセシビリティ基準（両プラットフォーム共通）

---

## 1. タッチターゲット

### ガイドライン要件

| プラットフォーム | 最小サイズ | 間隔 |
|---|---|---|
| Apple | 44x44 pt (~9mm) | 明示規定なし（Safe Areaとパディングで確保） |
| Google | 48x48 dp (~9mm) | ターゲット間 8dp以上 |
| WCAG 2.2 SC 2.5.8 | 24x24 CSS px (Level AA) | ターゲットが24px未満でも間隔で補償可 |

### 現状

| 要素 | サイズ | Apple | Google | 備考 |
|---|---|---|---|---|
| タブバーアイテム | 60x48dp | OK | OK | アイコン20px + パディング |
| プライマリボタン(Save等) | full幅 x 44dp | OK | NG (48dp未達) | `py-3`(12dp上下) + テキスト = 約44dp |
| カウンターボタン | flex-1 x py-3 | OK | NG (48dp未達) | 同上 |
| TaskCardチェックボックス | 32x32dp (hitSlop +8) | NG | NG | hitSlop合計でも44pt/48dp未達 |
| TaskCardアクションボタン | 16x16dp + hitSlop 4 | NG | NG | 実効24x24dp。WCAG最低ライン |
| カード全体タップ | 十分 | OK | OK | パディング含め48dp以上確保 |
| IMESafeTextInput | 44dp | OK | NG (48dp未達) | 明示的にheight:44 |

### 判定

- **Apple**: 一部NG（チェックボックス、小アクションボタン）
- **Google**: 広範囲でNG（44dpのものが多く48dp未達）
- **対応案**: `hitSlop`を最低`{top:10, bottom:10, left:10, right:10}`に統一。入力フィールドは`minHeight: 48`に

---

## 2. タイポグラフィ

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| システムフォント | San Francisco | Roboto |
| 最小フォントサイズ | 11pt | 12sp (Label Small) |
| 標準ボディ | 17pt (Body) | 14-16sp (Body Medium/Large) |
| スケーリング | Dynamic Type必須（200%+まで） | sp単位でシステム設定に追従 |
| 切り詰め禁止 | フォント拡大時にレイアウトがリフローすること | 同 |

### 現状

| レベル | NativeWindクラス | 実サイズ | Apple | Google |
|---|---|---|---|---|
| H1 | `text-3xl font-bold` | 30px | OK | OK |
| H2 | `text-2xl font-medium` | 24px | OK | OK |
| H3 | `text-xl font-bold` | 20px | OK | OK |
| H4 | `text-lg font-bold` | 18px | OK | OK |
| Body | `text-base` | 16px | OK (17pt推奨だが許容) | OK |
| Label | `text-sm` | 14px | OK | OK |
| Caption | `text-xs` | 12px | OK | OK (最小ライン) |
| タブラベル | 10px | 10px | NG (11pt未満) | NG (12sp未満) |

### Dynamic Type対応: 未対応

- NativeWindのpx指定はユーザーのフォントサイズ設定に**追従しない**
- Apple: **App Store審査基準に明記**（Larger Text Evaluation Criteria）
- 対応案: `allowFontScaling={true}`(React Nativeデフォルト)は有効だが、レイアウトのリフロー対応が別途必要。`numberOfLines={1}`でトランケーションしている箇所はフォント拡大時に情報欠落する

### 判定

- **Apple**: NG — Dynamic Type未対応、タブラベル11pt未満
- **Google**: NG — タブラベル12sp未満
- **重要度**: 高（審査対象）

---

## 3. ナビゲーション

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| ボトムタブ数 | 3-5（iPhoneは最大5。超過時はMoreタブ） | 3-5 |
| ラベル | アイコン+テキスト必須 | アイコン+テキスト（非アクティブはラベル非表示可） |
| 戻るボタン | 左上。左端スワイプ（iOS 26:どこからでも） | システムバックジェスチャー（両端から） |
| プライマリアクション | ナビバー/ツールバーに統合。FABなし | FAB（Floating Action Button）が標準 |

### 現状

| 項目 | 実装 | Apple | Google | 備考 |
|---|---|---|---|---|
| タブバー配置 | 画面下部 | OK | OK | |
| タブ数 | **6タブ** | NG | NG | Actiko/Daily/Stats/Goals/Tasks/Settings |
| アイコン+ラベル | あり | OK | OK | |
| アクティブ表示 | amber色 + ピルインジケータ | OK | OK | |
| スタック戻るジェスチャー | Expo Router標準 | OK | OK | iOS左端スワイプ対応済み |
| 認証フロー | Stack(headerless) | OK | OK | login→create-user |

### タブ6問題の解決案

- Settings をタブから外し、プロフィールアイコンまたはギアアイコンからのモーダル/ドロワーに変更
- または Daily と Stats を統合（日別→月別の切り替え）
- または「More」タブでSettings + Stats をまとめる

### 判定

- **Apple**: NG — 6タブは上限超過
- **Google**: NG — 同上

---

## 4. Safe Area

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| ステータスバー | 可変（20pt〜62pt。Dynamic Island含む） | 可変 |
| ホームインジケータ | 34pt下部インセット | N/A（ジェスチャーバーはより薄い） |
| ルール | コンテンツはSafe Area内、背景は画面端まで | 同 |

### 現状

| 項目 | 実装 | Apple | Google | 備考 |
|---|---|---|---|---|
| SafeAreaProvider | `react-native-safe-area-context` | OK | OK | |
| 上部インセット | `paddingTop: insets.top` | OK | OK | |
| 下部インセット | `paddingBottom: 10 + insets.bottom` | OK | OK | タブバー |
| ScrollView下部 | `paddingBottom: 80 + insets.bottom` | OK | OK | フローティングボタン考慮 |
| Modal statusBar | `statusBarTranslucent` | OK | OK | |

### 判定

- **Apple**: OK
- **Google**: OK

---

## 5. カラー・コントラスト

### ガイドライン要件

| 項目 | Apple | Google | WCAG |
|---|---|---|---|
| 通常テキスト | 7:1推奨、4.5:1最低 | 4.5:1 | 4.5:1 (AA) / 7:1 (AAA) |
| 大テキスト(18pt+) | 3:1 | 3:1 | 3:1 (AA) |
| UI要素 | 3:1 | 3:1 | 3:1 |
| ダークモード | 必須。セマンティックカラー推奨 | 必須。背景#121212推奨（純黒でない） | — |

### 現状: コントラスト比計算

#### Light Mode

| 組み合わせ | 前景 | 背景 | 比率 | WCAG AA |
|---|---|---|---|---|
| Primary text on bg | `#1c1917` | `#f5f5f4` | ~14.5:1 | OK |
| Primary text on surface | `#1c1917` | `#ffffff` | ~17.6:1 | OK |
| Secondary text on surface | `#57534e` | `#ffffff` | ~6.4:1 | OK |
| Tertiary text on surface | `#78716c` | `#ffffff` | ~4.2:1 | **NG** (4.5未達) |
| Muted text on surface | `#a8a29e` | `#ffffff` | ~2.6:1 | **NG** |
| Amber accent on surface | `#d97706` | `#ffffff` | ~3.5:1 | NG (通常テキスト) / OK (大テキスト) |
| Info blue on surface | `#3b82f6` | `#ffffff` | ~3.5:1 | NG (通常テキスト) / OK (大テキスト) |

#### Dark Mode

| 組み合わせ | 前景 | 背景 | 比率 | WCAG AA |
|---|---|---|---|---|
| Primary text on bg | `#fafaf9` | `#1c1917` | ~14.5:1 | OK |
| Primary text on surface | `#fafaf9` | `#292524` | ~11.8:1 | OK |
| Secondary text on surface | `#d6d3d1` | `#292524` | ~8.2:1 | OK |
| Tertiary text on surface | `#a8a29e` | `#292524` | ~4.5:1 | ギリギリOK |
| Muted text on surface | `#78716c` | `#292524` | ~2.8:1 | **NG** |
| Amber accent on surface | `#fbbf24` | `#292524` | ~8.2:1 | OK |
| Dark mode bg | `#1c1917` | — | — | OK (Google推奨の#121212に近い) |

### 判定

- **Apple**: NG — `tertiary`(Light)、`muted`(両モード)がコントラスト不足
- **Google**: NG — 同上
- **対応案**: `tertiary`を`#6b7280`(gray-500→600)へ、`muted`を装飾用途のみに限定しインタラクティブ要素には使わない

---

## 6. スペーシング・レイアウト

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| グリッドベース | 8pt推奨 | 8dp（微調整に4dp） |
| 画面マージン | 16pt (iPhone) / 24pt (iPad) | 16dp |
| セクション間隔 | 24pt | 24dp |
| コンテナパディング | 16pt | 16dp |

### 現状

| パターン | 実装値 | Apple | Google | 備考 |
|---|---|---|---|---|
| 画面パディング | `px-4`(16dp) | OK | OK | |
| ダイアログ内 | `px-5 py-4`(20/16dp) | OK | OK | |
| gap-1 | 4dp | OK | OK (4dp micro) | |
| gap-2 | 8dp | OK | OK | |
| gap-3 | 12dp | OK | OK | |
| gap-4 | 16dp | OK | OK | |
| gap-6 | 24dp | OK | OK | セクション間 |
| ScrollView下部 | 80 + insets.bottom | OK | OK | |

### アクティビティグリッド

```
effectiveWidth = Math.min(screenWidth, 768)
numColumns = Math.min(4, Math.max(2, Math.floor(effectiveWidth / 180)))
```

- 動的カラム数（2-4）はレスポンシブで適切
- 最大幅768px制限でタブレットでも読みやすい

### 判定

- **Apple**: OK
- **Google**: OK

---

## 7. アイコン

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| 推奨システム | SF Symbols (6,900+) | Material Symbols |
| 標準サイズ | コンテキスト依存（ツールバー~22pt） | 24dp標準 |
| タブバー規約 | 選択=**filled**、非選択=**outlined** | アクティブ=**filled**、非アクティブ=**outlined** |
| ツールバー | outlined (stroke 1-1.5pt) | outlinedデフォルト |

### 現状

| 項目 | 実装 | Apple | Google | 備考 |
|---|---|---|---|---|
| ライブラリ | Lucide React Native | — | — | SF Symbols/Material Symbolsではない |
| タブアイコンサイズ | 20px | OK (22pt推奨だが許容) | NG (24dp推奨) | |
| ラベルアイコン | 16px | OK | OK (20dp small許容) | |
| アクションカード | 28px | OK | OK | |
| **filled/outlined切替** | **なし（色変更のみ）** | **NG** | **NG** | 選択/非選択で同じアイコンスタイル |

### 使用アイコン一覧

- ナビゲーション: LayoutGrid, CalendarDays, BarChart3, Target, CheckSquare, Settings
- アクション: Plus, Pencil, Trash2, Archive, X
- ステータス: CheckCircle2, Circle, AlertCircle
- テーマ: Moon, Sun, Monitor
- その他: Lock, LogOut, ChevronLeft, ChevronRight, Calendar

### 判定

- **Apple**: NG — filled/outlined切替なし。SF Symbolsでない点は許容範囲
- **Google**: NG — filled/outlined切替なし。アイコンサイズ20px(24dp推奨)
- **対応案**: Lucideはfilled/outlinedバリアント未対応のため、タブアイコンのみSF Symbols(iOS)/Material Icons(Android)に切り替えるか、カスタムSVGで対応

---

## 8. モーダル・シート

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| 表示方法 | 下からスライドアップ。親画面を暗く表示 | ボトムシートがスライドアップ。スクリムオーバーレイ |
| 閉じる: ジェスチャー | **スワイプダウン**（データ損失リスク時は無効化） | **スワイプダウン**または**スクリムタップ** |
| 閉じる: 明示 | Done/Cancelボタン | Xボタンまたはシステムバック |
| データ保護 | 未保存データがある場合はスワイプ閉じを無効化 | 同 |

### 現状

| 項目 | 実装 | Apple | Google | 備考 |
|---|---|---|---|---|
| 表示方法 | `animationType="fade"` | OK | OK | フェードイン |
| Xボタン閉じ | あり（Lucide X） | OK | OK | |
| スワイプダウン閉じ | **なし** | **NG** | **NG** | ジェスチャーでの閉じ不可 |
| スクリムタップ閉じ | 一部あり | OK | OK | ModalOverlayの外側タップ |
| KeyboardAvoidingView | あり（iOS: padding, Android: height） | OK | OK | |
| データ保護 | 未実装 | NG | NG | フォーム入力中でも即閉じ可能 |

### 判定

- **Apple**: NG — スワイプダウン閉じ未対応
- **Google**: NG — 同上
- **対応案**: `@gorhom/bottom-sheet`またはExpo Routerのモーダルプレゼンテーション(`presentation: "modal"`)でネイティブシート挙動を実現

---

## 9. リスト

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| 最小行高 | 44pt | 1行: 56dp、2行: 72dp、3行: 88dp |
| スワイプアクション(trailing) | 削除・アーカイブ（右→左スワイプ） | M3標準外。コンテキストメニュー推奨 |
| スワイプアクション(leading) | ピン・お気に入り等（左→右スワイプ） | N/A |
| セパレータ | インセットディバイダー | フルまたはインセット |

### 現状

| 項目 | 実装 | Apple | Google | 備考 |
|---|---|---|---|---|
| LogCard行高 | 十分（アイコン+テキスト+バッジで72dp以上） | OK | OK | |
| TaskCard行高 | チェックボックス+テキスト+日付で60dp以上 | OK | OK | |
| GoalCard行高 | 大型カード（統計込み） | OK | OK | |
| スワイプアクション | **未実装** | **NG** | N/A | iOSでは期待されるパターン |
| セパレータ | gap/marginで分離 | OK | OK | カード型なので分離で適切 |
| `numberOfLines={1}` | LogCard, TaskCard | OK | OK | トランケーション |

### 判定

- **Apple**: NG — スワイプアクション未実装（削除・編集の導線がタップ→ダイアログのみ）
- **Google**: OK（スワイプはM3標準外）
- **対応案**: `react-native-gesture-handler`のSwipeableで編集/削除のスワイプアクション追加(iOS優先)

---

## 10. ローディング・エラー状態

### ガイドライン要件

| 項目 | Apple | Google | 両方 |
|---|---|---|---|
| インジケータ | 1秒以上でスピナー表示 | CircularProgressIndicator | フリーズ画面は禁止 |
| スケルトン | コンテンツ重い画面で推奨 | 推奨（体感待ち時間短縮） | 300ms以内に表示 |
| Pull-to-refresh | 標準パターン | 標準パターン | スクリーンリーダーでもフィードバック必要 |
| エラー状態 | インラインメッセージ | Snackbar/インライン | リトライアクション必須 |
| 空状態 | 説明+アクション | 説明+アクション | 何が起きたか+次にすべきことを表示 |

### 現状

| 項目 | 実装 | Apple | Google | 備考 |
|---|---|---|---|---|
| ローディングスピナー | `ActivityIndicator size="large"` | OK | OK | |
| スケルトンスクリーン | **なし** | NG | NG | 全画面スピナーのみ |
| Pull-to-refresh | **なし** | **NG** | **NG** | リストにRefreshControl未設定 |
| エラーバウンダリ | あり（リトライ+リカバリ） | OK | OK | 最大2回リトライ |
| 空状態メッセージ | あり（「記録なし」等） | OK | OK | |
| 同期保留表示 | amber枠+小スピナー | OK | OK | 視覚的に明確 |
| フォーム送信中 | ボタンdisabled + ラベル変更 | OK | OK | |

### 判定

- **Apple**: NG — Pull-to-refresh・スケルトンなし
- **Google**: NG — 同上

---

## 11. ハプティクス

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| フィードバック種類 | Impact(light/medium/heavy), Notification(success/warning/error), Selection | CONFIRM, REJECT等 |
| 使うべき場面 | 成功/エラー/警告、ピッカー変更、スナップ動作 | 同 |
| 使うべきでない場面 | 音と重複、過剰使用、因果関係不明 | 同 |
| 原則 | 因果関係(Causality)、調和(Harmony)、有用性(Utility) | 視覚と一致、過剰使用禁止 |

### 現状

**未実装** — `expo-haptics`未導入。コードベース全体にハプティクス関連の参照なし。

### 導入すべき箇所

| 場面 | ハプティクス種類 | 優先度 |
|---|---|---|
| カウンター増減 | Impact (light) | 高 |
| タイマー開始/停止 | Impact (medium) | 高 |
| ゴール達成通知 | Notification (success) | 高 |
| 削除確認 | Notification (warning) | 中 |
| チェックボックストグル | Selection | 中 |
| Binary Yes/No 切替 | Selection | 低 |

### 判定

- **Apple**: NG
- **Google**: NG
- **対応案**: `expo-haptics`をインストールし、上記の場面に`Haptics.impactAsync()`/`Haptics.notificationAsync()`を追加

---

## 12. アクセシビリティ

### ガイドライン要件

| 項目 | Apple | Google | WCAG |
|---|---|---|---|
| スクリーンリーダー | VoiceOver | TalkBack | 全インタラクティブ要素にラベル |
| セマンティックロール | `accessibilityTraits`(button/header/link等) | `Semantics`(Role.Button等) | 正しいロール宣言 |
| ラベル | 全要素に`accessibilityLabel` | 全要素に`contentDescription` | 簡潔で説明的 |
| テキストスケーリング | Dynamic Type (200%+) | sp単位+システム設定追従 | レイアウトリフロー必須 |
| コントラスト | 4.5:1 / 3:1 | 4.5:1 / 3:1 | WCAG AA |
| タッチターゲット | 44x44pt | 48x48dp | 24x24px |
| フォーカス順序 | 論理的な読み順 | 論理的な巡回順 | 視覚レイアウトと一致 |

### 現状

| 項目 | 実装 | Apple | Google | 備考 |
|---|---|---|---|---|
| `accessibilityLabel` | **OAuthボタンのみ** | **NG** | **NG** | 他のボタン・カード・入力すべて未設定 |
| `accessibilityRole` | **なし** | **NG** | **NG** | button/header/link等の宣言ゼロ |
| `accessibilityHint` | **なし** | **NG** | **NG** | 複雑なジェスチャーの説明なし |
| `accessibilityState` | **なし** | **NG** | **NG** | disabled/selected/expanded未宣言 |
| Dynamic Type | **未対応** | **NG** | — | NativeWindのfixed px。`allowFontScaling`はRNデフォルトtrue |
| コントラスト | 一部NG（上記セクション5参照） | NG | NG | tertiary/muted色 |
| タッチターゲット | 一部NG（上記セクション1参照） | NG | NG | |
| フォーカス順序 | RNデフォルト | OK | OK | 明示設定なしだがレイアウト順で概ね適切 |

### 判定

- **Apple**: **NG (重大)** — App Store審査でアクセシビリティ不足を指摘される可能性が高い
- **Google**: **NG (重大)** — TalkBackで操作不能な画面が大半
- **対応優先度**: 最高。全インタラクティブ要素への`accessibilityLabel`+`accessibilityRole`追加から着手

---

## 13. プラットフォーム別対応

### ガイドライン要件（iOS/Androidで異なるべき点）

| 領域 | iOS規約 | Android規約 |
|---|---|---|
| 戻るナビゲーション | 左上の戻るボタン + 左端スワイプ | システムバックジェスチャー（両端） |
| プライマリアクション | ナビバー/ツールバー内 | FAB |
| タブアイコン | filled(選択)/outlined(非選択) | filled(アクティブ)/outlined(非アクティブ) |
| スワイプ行アクション | 標準・期待される | 非標準。長押しメニュー推奨 |
| アラート | 中央ダイアログ | Materialダイアログ or Snackbar |
| 検索 | プルダウン検索バー | トップバー検索 or 全画面検索 |
| エレベーション | フラットデザイン、影最小 | カードにelevation(1-3) |
| ステータスバー | コンテンツと融合 | アプリテーマカラーに合わせて着色可 |

### 現状

| 項目 | 実装 | Apple | Google | 備考 |
|---|---|---|---|---|
| 認証ボタン | iOS: Apple Sign-In, Android: Google OAuth | OK | OK | `Platform.OS === "ios"` 分岐 |
| IME処理 | iOS/Android別パディング | OK | OK | `IMESafeTextInput`で対応 |
| Androidフォーカス | 200ms遅延フォーカス | — | OK | |
| KeyboardAvoiding | iOS: padding, Android: height | OK | OK | |
| Web固有UI | backdrop-filter, ファイルピッカー | — | — | Web版のみ |
| サブスクリプション | RevenueCatUI (非Web) | OK | OK | |
| **FAB** | **なし** | OK (不要) | **NG** | Androidでは追加アクションにFABが期待される |
| **Elevation/Shadow** | **フラット** | OK | **NG** | カードにelevationなし |
| **Predictive Back** | N/A | — | **NG** | Android 15+で必須のpredictive back animation未対応 |

### 判定

- **Apple**: 概ねOK（認証・IME・キーボード対応済み）
- **Google**: NG — FABなし、elevation未使用、Predictive Back未対応

---

## 14. アニメーション・トランジション

### ガイドライン要件

| 項目 | Apple | Google |
|---|---|---|
| 原則 | 短く正確、軽量に感じる | レスポンシブで表現豊か |
| 標準デュレーション | 250-350ms | 300ms（最大375ms full-screen） |
| イージング | システムspring推奨 | M3トークン: emphasized, standard等 |
| Reduce Motion | **必須**: モーション→ディゾルブ/フェードに置換。App Store審査対象 | **必須**: `ANIMATOR_DURATION_SCALE`尊重 |
| 禁止 | 400ms超は鈍重に感じる | 600ms超 |

### 現状

| アニメーション | デュレーション | イージング | Reduce Motion | 備考 |
|---|---|---|---|---|
| Toast fade-in | 300ms | Animated.timing | **なし** | DebtFeedbackToast |
| Toast slide-in | 300ms | Animated.timing | **なし** | translateY: 30→0 |
| Toast pulse | 150ms x 3 | scale 1→1.05→1.08→1 | **なし** | 称賛モード |
| UpdateToast | 300ms | fade+slide from top | **なし** | OTA通知 |
| Grid stagger | FadeInDown.delay(index * 35) | Reanimated | **なし** | ActikoPage |
| Modal | fade (300ms) | Animated.timing | **なし** | ModalOverlay |
| `useNativeDriver` | 全アニメーション | — | — | パフォーマンスOK |

### 判定

- **Apple**: NG — **Reduce Motion未対応（App Store審査対象）**。デュレーション自体は適切(300ms)
- **Google**: NG — Reduce Motion未対応
- **対応案**: `AccessibilityInfo.isReduceMotionEnabled`をチェックし、true時はアニメーションをスキップまたはフェードに置換

---

## 15. テーマ・カラーシステム

### 現状のカラーパレット

#### Light Mode

```
背景:
  bg:              #f5f5f4   (stone-100)
  surface:         #ffffff   (white)
  surfaceSecondary:#fafaf9   (stone-50)

テキスト:
  text:            #1c1917   (stone-900)
  textSecondary:   #57534e   (stone-600)
  textTertiary:    #78716c   (stone-500)  ← コントラスト不足
  textMuted:       #a8a29e   (stone-400)  ← コントラスト不足

ボーダー:
  border:          #e7e5e4   (stone-200)
  borderLight:     #f5f5f4   (stone-100)

アクセント:
  amber:           #d97706   (amber-600)
  amberLight:      #f59e0b   (amber-500)
  amberBg:         #fffbeb   (amber-50)

UI:
  tabBg:           rgba(255,255,255,0.82)
  tabActive:       #d97706
  tabInactive:     #a8a29e
  modalOverlay:    rgba(28,25,23,0.35)
  info:            #3b82f6
```

#### Dark Mode

```
背景:
  bg:              #1c1917   (stone-900)
  surface:         #292524   (stone-800)

テキスト:
  text:            #fafaf9   (stone-50)
  textSecondary:   #d6d3d1   (stone-300)
  textTertiary:    #a8a29e   (stone-400)
  textMuted:       #78716c   (stone-500)  ← コントラスト不足

アクセント:
  amber:           #f59e0b   (amber-500)
  amberLight:      #fbbf24   (amber-400)
  amberBg:         rgba(120,53,15,0.3)

UI:
  tabBg:           rgba(28,25,23,0.82)
  tabActive:       #fbbf24
  tabInactive:     #78716c
  modalOverlay:    rgba(0,0,0,0.55)
  info:            #60a5fa
```

#### ステータスカラー

- 成功/完了: `#22c55e` (green-500)
- エラー/期限超過: `#ef4444` (red-500)
- 警告/保留: `#f97316` (orange-500)
- 情報: `#3b82f6` (blue-500)

### 判定

- テーマシステム自体は適切に構築されている
- **問題**: tertiary/mutedカラーのコントラスト不足（セクション5で詳述）

---

## サマリー: 準拠/違反マトリクス

| カテゴリ | Apple HIG | Material Design 3 | 重要度 |
|---|---|---|---|
| 1. タッチターゲット | NG (一部) | NG (広範囲) | 中 |
| 2. タイポグラフィ | NG (Dynamic Type, タブラベル) | NG (タブラベル) | **高** |
| 3. ナビゲーション | NG (6タブ) | NG (6タブ) | 中 |
| 4. Safe Area | OK | OK | — |
| 5. カラー・コントラスト | NG (tertiary/muted) | NG (tertiary/muted) | 中 |
| 6. スペーシング | OK | OK | — |
| 7. アイコン | NG (filled/outlined) | NG (filled/outlined, サイズ) | 中 |
| 8. モーダル | NG (スワイプ閉じ) | NG (スワイプ閉じ) | 中 |
| 9. リスト | NG (スワイプアクション) | OK | 低 |
| 10. ローディング | NG (Pull-to-refresh, スケルトン) | NG (同) | 中 |
| 11. ハプティクス | NG | NG | 中 |
| 12. アクセシビリティ | **NG (重大)** | **NG (重大)** | **最高** |
| 13. プラットフォーム別 | 概ねOK | NG (FAB, elevation, Predictive Back) | 中 |
| 14. アニメーション | NG (Reduce Motion) | NG (Reduce Motion) | **高** |
| 15. テーマ | OK (構造) | OK (構造) | — |

---

## 対応優先度

### P0 — App Store/Play Store審査リスク

1. **アクセシビリティ全般** (セクション12) — `accessibilityLabel`、`accessibilityRole`の全面追加
2. **Dynamic Type対応** (セクション2) — テキストスケーリングとレイアウトリフロー
3. **Reduce Motion対応** (セクション14) — `AccessibilityInfo.isReduceMotionEnabled`チェック

### P1 — UX品質・ガイドライン準拠

4. **タブバー6→5** (セクション3) — Settings分離
5. **モーダルスワイプ閉じ** (セクション8) — `@gorhom/bottom-sheet`導入
6. **タッチターゲット統一** (セクション1) — 全ボタン48dp以上
7. **コントラスト修正** (セクション5) — tertiary/mutedカラー調整
8. **ハプティクス導入** (セクション11) — `expo-haptics`

### P2 — ポリッシュ

9. **アイコンfilled/outlined** (セクション7)
10. **Pull-to-refresh** (セクション10)
11. **スケルトンスクリーン** (セクション10)
12. **リストスワイプアクション** (セクション9, iOS)
13. **Android FAB/elevation** (セクション13)
14. **タブラベル最小サイズ** (セクション2) — 10px→12px
