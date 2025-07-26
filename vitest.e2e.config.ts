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
    hookTimeout: 60000, // E2Eテストは時間がかかるため60秒に設定
    testTimeout: 60000, // E2Eテストは時間がかかるため60秒に設定
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