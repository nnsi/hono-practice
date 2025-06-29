# モバイルアプリ（React Native）コードレビュー

> 対象ディレクトリ: `apps/mobile/`
>
> 2025-06 時点での実装をレビューし、拡張性・モダンさ・保守性の観点から改善ポイントを整理しました。

---

## 1. プロジェクト構成

| 現状 | 指摘 | 推奨アクション |
|------|------|----------------|
| `app/` と `src/screens/` に UI が重複 | 画面が二重管理になり保守コスト増 | Expo Router を正とし、`src/screens/` は UI 部品へリネーム or 削除 |
| `src/utils/apiClient.ts` と `src/services/apiClient.ts` が並存 | API クライアントの重複定義 | **1 つのモジュールへ統合**し、全層で同一インスタンスを利用 |
| `.swp` など一時ファイルが Git 管理下 | ノイズコミットの温床 | `.gitignore` に `*.swp` を追加 |

## 2. API クライアント & 認証

* `apps/mobile/src/utils/apiClient.ts` では fetch をラップしトークンリフレッシュを自前実装。肥大化しがちなため、以下の 2 方向を検討:
  1. **axios + interceptors** へ移行し簡潔化
  2. fetch を継続する場合は `react-query` の `queryClient.setDefaultOptions()` で `retry`/`onError` を一元化
* `DeviceEventEmitter` と `window.dispatchEvent` が混在 → **イベント実装を Context または共通 EventEmitter に統一** する
* `TokenProvider` のタイマーはアプリ kill / BG 送りで無効化される → `AppState` フォアグラウンド復帰時に `refreshToken()` を実行

```30:78:apps/mobile/src/providers/TokenProvider.tsx
scheduleTokenRefresh(token)
```

## 3. ルーティング

* `(auth)/_layout.tsx` のリダイレクト先が存在しない (`/(app)/home`) → `href="/(app)"` 等に修正
* `QueryClientProvider` が画面単位で生成されている → **アプリ全体で 1 つ** に集約しキャッシュを共有

```1:19:apps/mobile/app/_layout.tsx
<TokenProvider>
  <AuthProvider>
    <QueryClientProvider client={queryClient}>  // ★ここで全体に提供
      <Stack> ... </Stack>
    </QueryClientProvider>
  </AuthProvider>
</TokenProvider>
```

## 4. hooks / React-Query

* `useActivities` は zod でパースしており型安全。ただし `staleTime` / `cacheTime` 無指定 → 不要リフェッチを削減する設定を追加
* `queryKey` を整理 (`["activities", date]` など) し、`invalidateQueries` しやすく

## 5. UI / デザインシステム

* NativeWind + Tailwind はモダン。
* カラーコードが散在 → `tailwind.config.js` の `theme.extend.colors` へ移動
* フォームは `react-hook-form + zodResolver` を共通 wrapper 化し DRY に

## 6. アクセシビリティ & i18n

* Icon のみの `TouchableOpacity` に `accessibilityLabel` が無い ⇒ 追加
* 将来的な多言語化を想定し `i18next` の導入を検討

## 7. テスト / CI

* **Jest + @testing-library/react-native + MSW** で Hook & 画面をユニットテスト
* `@react-native/eslint-config` + `prettier-plugin-tailwindcss` を導入し、husky でコミット前自動整形

## 8. パフォーマンス

* `FlatList` の `renderItem` インライン定義を `useCallback` / `React.memo` でメモ化
* バッチ API で取得したデータは正規化 (`{[id]: ...}`) して参照を O(1) に

## 9. CD / リリースフロー

* EAS Build & Submit の `eas.json` を設定し、PR で preview・main で production を自動化

---

### 実施優先度 (HIGH → LOW)
1. API クライアント統合 & QueryClient の全体配布
2. ルーティング重複解消 (`app/` に一本化)
3. Token リフレッシュの AppState 対応
4. ESLint / Prettier & git-hook 導入
5. 色・テキストリソースの整理、アクセシビリティ対応
6. テスト基盤整備 & バックグラウンド最適化

---

以上を進めることで、モダンなアーキテクチャを保ちつつ長期運用に耐えるコードベースとなります。 