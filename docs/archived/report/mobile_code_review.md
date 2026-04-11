# モバイルアプリ（React Native）コードレビュー — **再レビュー版**

> 対象ディレクトリ: `apps/mobile/`
>
> 2025-06 再レビュー。前回指摘を踏まえコードを更新いただいたため、最新コミットを再確認し **解消された項目** と **残課題 / 追加改善点** を整理しました。

---

## 1. 解消・改善を確認できた項目

| 👍 改善内容 | 確認結果 |
|-------------|----------|
| **API クライアント統合** | `src/utils/apiClient.ts` に一本化。`createApiClient` ＋ `mobileFetch` で簡潔化。 |
| **QueryClient グローバル化** | `app/_layout.tsx` で `QueryClientProvider` を全体提供。`staleTime` など `defaultOptions` 設定済み。 |
| **Token 自動更新の堅牢化** | `TokenProvider` が `AppState` を監視し、フォアグラウンド復帰時にトークン有効性を再評価。 |
| **UI ルート統一** | 旧 `src/screens/` が削除され、Expo Router に統一。 |
| **一時ファイル排除** | `.swp` など不要ファイルを Git 管理外に。 |

---

## 2. 残課題・追加で見つかった改善点

| # | 課題・指摘 | 推奨アクション |
|---|-------------|----------------|
| 2-1 | **イベント通知方式が混在**<br/>`DeviceEventEmitter` と `window.dispatchEvent` の併用 | `mitt` や `eventemitter3` 等の軽量 Pub/Sub を 1 つ採用し、Context 内のみで購読・発火に集約。 |
| 2-2 | **カラーコードのハードコーディング**<br/>`#ef4444` などが複数ファイルに散在 | `tailwind.config.js` の `theme.extend.colors` へ登録し、`text-danger` などのユーティリティで利用。 |
| 2-3 | **巨大コンポーネント `daily.tsx` (~600 行)** | UI / ロジック / モーダルを分割: `ActivityDateHeader`, `TaskList`, `ActivityLogEditDialog` などを `src/components/daily/` へ抽出し `React.memo` + `useCallback` で最適化。 |
| 2-4 | **空ディレクトリ `src/services`** | 意図が無ければ削除。残す場合は README で役割を説明。 |
| 2-5 | **ESLint / Prettier / git-hook 未導入** | `@react-native/eslint-config`, `eslint-plugin-react-hooks`, `prettier-plugin-tailwindcss` を導入し、`husky` + `lint-staged` でコミット前整形を強制。 |
| 2-6 | **アクセシビリティ属性不足**<br/>Icon ボタンに `accessibilityLabel` 等未設定 | `TouchableOpacity` へ `accessibilityRole="button"` `accessibilityLabel="削除"` 等を付与し VoiceOver/TalkBack に対応。 |
| 2-7 | **型の `any` 残存**<br/>`daily.tsx` 内で `any[]` を使用 | DTO から `z.infer<typeof Schema>` を用いて厳密型付け。 |
| 2-8 | **Tailwind カラー拡張未設定** | `theme.extend.colors` に `primary` `danger` `success` などを定義し、クラスで再利用。 |

---

## 3. 詳細コメント

### 3-1. イベント通知の統一
```tsx
// 例: mitt を使用したグローバルイベントハブ
import mitt from "mitt";
export const eventBus = mitt<{
  "token-refreshed": string;
  "unauthorized": void;
}>();

// 送信
eventBus.emit("token-refreshed", token);

// 受信
useEffect(() => {
  eventBus.on("token-refreshed", setAccessToken);
  return () => eventBus.off("token-refreshed", setAccessToken);
}, []);
```
これにより Web / ネイティブ固有 API への依存を排除できます。

### 3-2. `daily.tsx` 分割の一例
```txt
components/
  daily/
    ActivityDateHeader.tsx
    TaskList.tsx
    ActivityLogEditDialog.tsx
pages/
  (app)/(tabs)/daily.tsx  // 実質コンテナのみ
```

### 3-3. Tailwind カラー定義例
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",
        danger: "#ef4444",
        success: "#10b981",
      },
    },
  },
};
```
使用例: `text-danger`, `bg-primary`.

### 3-4. ESLint / Prettier 推奨設定
```bash
pnpm add -D eslint prettier @react-native/eslint-config eslint-plugin-react-hooks \
           prettier-plugin-tailwindcss husky lint-staged
```
`.eslintrc.js` や `prettier.config.js` を追加し、`husky pre-commit` で `pnpm lint-staged` を実行。

---

## 4. 優先度付きロードマップ（HIGH → LOW）
1. イベント通知方式の統一 (2-1)
2. `daily.tsx` コンポーネント分割とパフォーマンス最適化 (2-3)
3. Tailwind カラー定義整備＋ハードコード置換 (2-2, 2-8)
4. ESLint / Prettier / Git フック導入 (2-5)
5. `any` 型排除と型推論徹底 (2-7)
6. アクセシビリティ属性追加 (2-6)
7. 空ディレクトリ整理 (2-4)

---

これらを完了することで、コードベースは **一段と統一感が高まり、長期運用・チーム開発にも強い構造** となります。さらなるブラッシュアップにお役立てください 🛠️ 