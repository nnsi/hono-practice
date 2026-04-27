import path from "node:path";

import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // @ts-expect-error vite-tsconfig-paths plugin type not fully compatible with vite 5
  plugins: [viteTsConfigPaths()],
  esbuild: {
    target: "esnext",
    jsx: "automatic",
  },
  test: {
    globals: true,
    setupFiles: ["./e2e/setup/perWorkerSetup.ts"],
    hookTimeout: 60000, // E2Eテストは時間がかかるため60秒に設定
    testTimeout: 60000, // E2Eテストは時間がかかるため60秒に設定
    retry: 1, // 並列実行時の偶発的なタイミングflakeを吸収する
    include: [
      // E2Eテストのみを対象
      "**/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
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
    ],
    environment: "node",
    // 各 worker が独自の backend/frontend/PGlite を VITEST_POOL_ID ベースの
    // ポート分離で起動する。isolate: false で worker 内の module cache を共有し、
    // perWorkerInfra のシングルトンが 1 worker につき 1 回だけ起動するようにする。
    pool: "forks",
    poolOptions: {
      forks: {
        isolate: false,
        minForks: 1,
        maxForks: Number(process.env.E2E_MAX_FORKS ?? 4),
      },
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
