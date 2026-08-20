import path from "node:path";

import viteTsConfigPaths from "vite-tsconfig-paths";
import { type Plugin, defineConfig } from "vitest/config";

const TEST_FILE_EXT = "*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}";

// DOM環境（jsdom）が必要なテストの範囲
const jsdomInclude = [
  // mobile useLiveQuery hookのrace/unmountテストはDOM rendererが必要
  `**/apps/mobile/src/db/useLiveQuery.test.tsx`,
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
  // Tail Workerのログparse/writeテスト
  `**/apps/tail-worker/**/${TEST_FILE_EXT}`,
  // scriptsのテスト (generator 等)
  "**/scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
  // Drizzle schema/migration guard tests
  `**/infra/drizzle/test/**/${TEST_FILE_EXT}`,
];

// PGlite compiles WebAssembly and runs every migration when a DB-backed suite
// starts. Running several of these suites at once can exhaust CI resources and
// make otherwise healthy beforeAll hooks hit their timeout. Keep the DB suites
// in a dedicated serial project while the remaining Node tests stay parallel.
const databaseInclude = [
  `**/apps/backend/**/*Route*.test.ts`,
  `**/apps/backend/**/*Repository.integration.test.ts`,
  `**/apps/backend/**/adminSessionRepository.test.ts`,
  `**/apps/backend/**/apiKeyAuth.test.ts`,
  `**/apps/backend/**/scopeIntegration.test.ts`,
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
  // TZ 固定が必須のテストは専用 project (tz-havana / tz-tokyo) でのみ実行する
  "**/packages/domain/test/_tz/**",
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
          exclude: [...sharedExclude, ...jsdomInclude, ...databaseInclude],
        },
      },
      {
        extends: true,
        test: {
          name: "database",
          environment: "node",
          include: databaseInclude,
          exclude: sharedExclude,
          fileParallelism: false,
          maxWorkers: 1,
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
      // DST/JST 依存の regression テストは実タイムゾーンを固定して実行する。
      // pool: "forks" で独立プロセスにすることで env.TZ が他 project (threads)
      // に漏れないようにする（UTC ランナーでは旧実装バグが再現しないため必須）。
      {
        extends: true,
        test: {
          name: "tz-havana",
          environment: "node",
          pool: "forks",
          env: { TZ: "America/Havana" },
          include: ["**/packages/domain/test/_tz/dstMidnight*.tz.test.ts"],
          exclude: ["**/node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "tz-tokyo",
          environment: "node",
          pool: "forks",
          env: { TZ: "Asia/Tokyo" },
          include: ["**/packages/domain/test/_tz/jstMidnight*.tz.test.ts"],
          exclude: ["**/node_modules/**"],
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
