import build from "@hono/vite-build/cloudflare-workers";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/

export default defineConfig(({ mode }) => {
  if (mode === "server") {
    return {
      plugins: [
        tsconfigPaths(),
        build({
          entry: "./backend/server.cf.ts",
          outputDir: "./dist-backend",
          external: ["**/*.test.ts", "**/test.*.ts"],
        }),
      ],
      test: {
        setupFiles: ["./backend/setup.test.ts"],
        env: {
          NODE_ENV: "test",
          JWT_SECRET: "test-jwt",
        },
      },
      ssr: {
        target: "webworker",
      },
    };
  }

  // frontend
  if (mode === "stg" || mode === "production") {
    const env = loadEnv(mode, process.cwd(), "");

    return {
      publicDir: "frontend/public",
      plugins: [tsconfigPaths(), TanStackRouterVite(), react()],
      build: {
        outDir: "dist-frontend",
        emptyOutDir: true,
      },
      define: {
        ...env,
      },
    };
  }

  // test
  return {
    plugins: [tsconfigPaths(), TanStackRouterVite(), react()],
  };
});
