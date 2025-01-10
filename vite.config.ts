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
          entry: "./backend/index.ts",
          outputDir: "./dist-backend",
        }),
      ],
      test: {
        setupFiles: ["./backend/test.setup.ts"],
      },
    };
    // biome-ignore lint/style/noUselessElse: <explanation>
  } else {
    return {
      publicDir: "frontend/public",
      plugins: [tsconfigPaths(), TanStackRouterVite(), react()],
      build: {
        outDir: "dist-frontend",
        emptyOutDir: true,
      },
    };
  }
});
