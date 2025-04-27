# フロントエンドの構造について

## 技術スタック

- React
- TypeScript
- Tanstack Query
- Tanstack Router
- Vite

## ファイル構造

```txt
apps/frontend/src/
├── components/
│   ├── {feature}/
│   │   ├── {subFeature}/
│   │   │   ├── {subFeature}Page.tsx
│   │   │   └── {subFeature}Component.tsx
│   │   ├── FeaturePage.tsx
│   │   └── FeatureComponent.tsx
│   ├── root/
│   │   ├── AuthenticatedLayout.tsx # 認証後のレイアウト
│   │   └── RootPage.tsx
│   └── ui/ # shadcn/uiで作成されたコンポーネント
│       └── {component}.tsx
├── routes/
│   ├── {feature}/
│   │   ├── $id.tsx
│   │   └── {name}.tsx
│   ├── __root.tsx
│   └── {feature}.tsx
```
