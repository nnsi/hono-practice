# frontend-shared パッケージ／共通化レビュー結果

2025-08-07 時点での `packages/frontend-shared` を中心としたフロントエンド (Web) とモバイル (React-Native) のコード共通化に関するレビュー結果です。

---

## 追加レビュー (2025-08-08)

### 結論
- 方針は概ね良好。`packages/frontend-shared` へロジック集約 + アダプタ/DI による環境差分吸収はスケーラブル。
- 運用安定化のため、以下4点を優先対応すると効果が高い。
  - トークンの永続化
  - リフレッシュ戦略の明示的な注入（Cookie/Bearer両対応）
  - `any` の撤廃（ジェネリクス/型ガード化）
  - エイリアス統一とモバイルも含む型チェックのCI化

### 重要な指摘（優先度順）
- トークン永続化の欠如
  - 共有の `tokenStore` はメモリのみ。リロード/再起動で失われるため、`localStorage`/`AsyncStorage` 等で永続化できるストアAPIを共有側に用意する。
- リフレッシュ戦略がクライアント内で分岐し暗黙的
  - Web: `/auth/token` を Cookie 前提、RN: `refreshToken` の Bearer 前提。共有クライアントに「戦略」を注入する設計に寄せる。
- any の残存
  - 共有フック（例: 画像リサイズ）に `any` がある。プラットフォーム固有型をジェネリクスで受ける。
- エイリアス二重化/型チェックの偏り
  - `@packages/frontend-shared` と `@frontend-shared/*` が混在。どちらかに統一し、Web/モバイル双方で `tsc --noEmit` をCIで実行。

### 改善提案（最小変更の実装ガイド）

- 共有: 永続トークンストアの提供
  - ストレージ実装（Web: `localStorage`、RN: `AsyncStorage`）を注入して、同一APIで扱えるストアを共有に追加。

```ts
// shared: tokenPersistentStore.ts（新規）
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export interface TokenStorage {
  getToken(): string | null;
  setToken(token: string | null): void;
  clearToken(): void;
}

export function createPersistentTokenStore(
  storage: KeyValueStorage,
  key = "accessToken",
): TokenStorage {
  let inMemory: string | null = null;
  const load = () => {
    const v = (storage.getItem as any)(key); // 実装側で同期/非同期をラップして注入
    if (v && typeof (v as any).then === "function") return; // 非同期版は初回に呼び出し側でawaitする
    inMemory = (v as string | null) ?? null;
  };
  try { load(); } catch {}

  return {
    getToken: () => inMemory,
    setToken: (t) => {
      inMemory = t;
      if (t === null) (storage.removeItem as any)(key);
      else (storage.setItem as any)(key, t);
    },
    clearToken: () => {
      inMemory = null;
      (storage.removeItem as any)(key);
    },
  };
}
```

- 共有: APIクライアントにリフレッシュ戦略を注入
  - Cookie/Bearer の差分を `refreshStrategy` として外出し。`credentials` も戦略側で指定。

```ts
// shared: apiClient.ts（既存拡張の例）
type RefreshResult = { accessToken: string; refreshToken?: string };

type RefreshStrategy = {
  credentials: RequestCredentials; // 'include' | 'omit'
  performRefresh: (baseUrl: string) => Promise<RefreshResult>;
};

type ApiClientConfig = {
  baseUrl: string;
  getAccessToken: () => string | null;
  persistTokens?: (tokens: RefreshResult) => void;
  onUnauthorized?: () => void;
  onTokenRefreshed?: (token: string) => void;
  customFetch?: typeof fetch;
  refreshStrategy: RefreshStrategy;
};
```

- 共有: `ImageResizer` の `any` 撤廃（ジェネリクス）

```ts
export interface ImageResizer<Input> {
  resizeImage(
    input: Input,
    maxWidth: number,
    maxHeight: number,
  ): Promise<{ base64: string; mimeType: string }>;
}

export function createUseUploadActivityIcon<Input>(
  resizer: ImageResizer<Input>,
  apiConfig: { getApiUrl: () => string; getToken: () => string | null },
) { /* ... */ }
```

- エイリアス統一とCI
  - `@frontend-shared/*` に統一（または `@packages/frontend-shared` に統一）し、全アプリで解決できるよう `tsconfig` を整理。
  - ルート `package.json` に `"tsc:web"`, `"tsc:mobile"` を追加し、CI で双方実行。

### 追加の補足
- API URL 生成の本番フォールバック
  - 本番で `API_URL` 未設定時に空文字になるパスは、明示的にエラーを投げるかデフォルト値を持たせ、デプロイミスを早期検知。
- モバイルのセキュアストレージ
  - 可能なら `expo-secure-store` で `refreshToken` を保護（将来検討）。
- アダプタ分岐のバンドル最適化
  - `index.native.ts`/`index.web.ts` などの条件分岐や `package.json#exports` の条件エクスポートを検討。

### 推奨アクション（短期）
- [ ] 共有 `createPersistentTokenStore` 実装 + Web/Mobile から注入
- [ ] 共有 `createApiClient` を戦略注入型に拡張（Cookie/Bearer 両対応）
- [ ] 共有フックの `any` をジェネリクス化（特に画像関連）
- [ ] エイリアス統一と CI で Web/Mobile の `tsc --noEmit` を追加

上記を適用すれば、共通化の完成度が上がり、保守性・安全性・移植性が一段と向上します。

## 1. 設計全体

| 評価 | 内容 |
| --- | --- |
| ✅ | モノレポ直下 `apps/(frontend|mobile)` と `packages/frontend-shared` に機能を分離し、共有ロジックを **frontend-shared** へ集約する方針は妥当。 |
| ✅ | 環境依存の処理を `adapters/web.ts` / `adapters/react-native.ts` に閉じ込め DI する構成はスケーラブル。 |

---

## 2. 改善ポイントと推奨アクション

| 優先度 | 指摘 | 説明 / 推奨策 |
| --- | --- | --- |
| 🔴 | `any` の残存 | テスト以外のプロダクションコードに `any`/`as any` が残っている。`unknown` + 型ガード or ジェネリクスで置換する。eslint で `no-explicit-any` を error 化。 |
| 🔴 | トークン永続化 | `tokenStore` がメモリのみ。Web リロードや RN 再起動で消失→UX 低下。`createPersistentTokenStore(storage)` を追加し、`localStorage`/`AsyncStorage` を注入。 |
| 🔴 | Cookie 前提のリフレッシュ API | RN の fetch は Cookie を保持できず 401 ループの恐れ。モバイル専用に JSON で `refresh_token` を返すか SecureStore 管理へ変更。 |
| 🟡 | alias / 型チェック統一 | `@packages/frontend-shared` と `@frontend-shared/*` の二重 alias が存在。1 つに集約し、CI で mobile の型チェックも走らせる。 |
| 🟡 | Adapter の tree-shaking | Web adapter が `window.alert` などを含み RN バンドルにも混入。`package.json#exports` でブラウザ限定にする or `*.web.ts`/`*.native.ts` 分割。 |
| 🟡 | Metro blockList 保守性 | `db-data` 等を正規表現列挙しているが増減時に手修正が必要。共通除外パターンを関数化する。 |
| ⚪ | UI コンポーネント共有 | 将来的に React-Native-Web/Tamagui 導入で UI も共通化可能。現段階ではスコープ外だが検討余地。 |

---

## 3. まとめ

* 抽象化レイヤとモノレポ構成は **概ね良好**。
* 主要な課題は「トークン永続化」「Cookie 前提 API」「`any` 撲滅」「型チェック運用」の 4 つ。
* 上記を解消すればフロント & モバイル共通化はよりスムーズかつ拡張性高く維持可能。

---
