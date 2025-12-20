import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/

export default defineConfig(() => {
  return {
    plugins: [tsconfigPaths()],
    test: {
      setupFiles: ["./apps/backend/test.setup.ts"],
      env: {
        NODE_ENV: "test",
        JWT_AUDIENCE: "test-audience",
        JWT_SECRET: "test-jwt",
        IS_REACT_ACT_ENVIRONMENT: "true",
      },
      exclude: ["db-data/**", "node_modules/**"],
      testTimeout: 30000, // 30 seconds for individual tests
      hookTimeout: 30000, // 30 seconds for hooks (beforeAll, afterEach, etc.)
    },
  };
});
