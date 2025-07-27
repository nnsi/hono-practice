import path from "node:path";

import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [viteTsConfigPaths() as any],
  esbuild: {
    target: "es2020",
    jsx: "automatic",
  },
  test: {
    globals: true,
    hookTimeout: 30000, // 30秒のタイムアウトを設定
    testTimeout: 30000, // テスト自体のタイムアウトも30秒
    include: [
      // バックエンドのテスト
      "**/apps/backend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      // フロントエンドのテスト
      "**/apps/frontend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      // 共通パッケージのテスト
      "**/packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/db-data/**",
      "**/dist-frontend/**",
      "**/mobile/**",
      "**/e2e/**",
    ],
    environment: "node",
    environmentMatchGlobs: [
      // フロントエンドのテストはjsdom環境で実行
      ["**/apps/frontend/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.gen.ts",
        "**/mockData.ts",
        "**/test-utils/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@backend": path.resolve(__dirname, "./apps/backend"),
      "@frontend": path.resolve(__dirname, "./apps/frontend/src"),
      "@dtos": path.resolve(__dirname, "./packages/types"),
      "@packages": path.resolve(__dirname, "./packages"),
    },
  },
});
