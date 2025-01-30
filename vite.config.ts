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
        JWT_SECRET: "test-jwt",
      },
    },
  };
});
