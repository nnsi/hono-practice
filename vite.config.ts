import build from "@hono/vite-build/node";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
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
        }),
      ],
      test: {
        setupFiles: ["./backend/test.setup.ts"],
        env: {
          NODE_ENV: "test",
          JWT_SECRET: "test-jwt",
        },
      },
    };
  }

  // frontend
  return {
    publicDir: "frontend/public",
    plugins: [tsconfigPaths(), TanStackRouterVite(), react()],
    build: {
      outDir: "dist-frontend",
      emptyOutDir: true,
    },
  };
});
