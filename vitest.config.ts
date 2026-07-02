import path from "node:path";

import viteTsConfigPaths from "vite-tsconfig-paths";
import { type Plugin, defineConfig } from "vitest/config";

const TEST_FILE_EXT = "*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}";

// DOM環境（jsdom）が必要なテストの範囲
const jsdomInclude = [
  // frontend-shared/adaptersのテストもDOM環境が必要
  `**/packages/frontend-shared/adapters/**/${TEST_FILE_EXT}`,
  // frontend-shared/hooksのテストもDOM環境が必要
  `**/packages/frontend-shared/hooks/**/${TEST_FILE_EXT}`,
  // auth-client/react の hook テストも DOM 環境が必要
  `**/packages/auth-client/react/**/${TEST_FILE_EXT}`,
  // admin frontendのテストはjsdom環境が必要
  `**/apps/admin-frontend/**/${TEST_FILE_EXT}`,
  // frontendのテストはjsdom環境が必要（React hooks, DOM API）
  `**/apps/frontend/**/${TEST_FILE_EXT}`,
];

const nodeInclude = [
  // バックエンドのテスト
  `**/apps/backend/**/${TEST_FILE_EXT}`,
  // 共通パッケージのテスト（jsdom対象を除く。excludeで除外）
  `**/packages/**/${TEST_FILE_EXT}`,
  // mobileのテスト
  `**/apps/mobile/**/${TEST_FILE_EXT}`,
  // scriptsのテスト (generator 等)
  "**/scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
];

const sharedExclude = [
  "**/node_modules/**",
  "**/dist/**",
  "**/cypress/**",
  "**/.{idea,git,cache,output,temp}/**",
  "**/.claude/worktrees/**",
  "**/.worktrees/**",
  "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
  "**/db-data/**",
  "**/dist-frontend/**",
  "**/e2e/**",
];

export default defineConfig({
  plugins: [viteTsConfigPaths() as unknown as Plugin],
  esbuild: {
    target: "es2020",
    jsx: "automatic",
  },
  test: {
    globals: true,
    setupFiles: ["./apps/mobile/test.setup.ts"],
    hookTimeout: 30000, // 30秒のタイムアウトを設定
    testTimeout: 30000, // テスト自体のタイムアウトも30秒
    silent: true,
    pool: "threads",
    maxWorkers: 4,
    maxConcurrency: 5,
    // vitest 4 で environmentMatchGlobs が削除されたため、
    // node / jsdom の2プロジェクトに分割している
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: nodeInclude,
          exclude: [...sharedExclude, ...jsdomInclude],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: jsdomInclude,
          exclude: sharedExclude,
        },
      },
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
      "@/*": path.resolve(__dirname, "./apps/frontend/src/*"),
    },
  },
});
