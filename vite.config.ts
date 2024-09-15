import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import build from "@hono/vite-build/node";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === "server") {
    return {
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./"),
          "@ui": path.resolve(__dirname, "./frontend/src/components/ui"),
        },
      },
      plugins: [
        build({
          entry: "./backend/index.ts",
          outputDir: "./dist-backend",
        }),
      ],
    };
  } else {
    return {
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./"),
          "@ui": path.resolve(__dirname, "./frontend/src/components/ui"),
        },
      },
      plugins: [TanStackRouterVite(), react()],
      build: {
        outDir: "dist-frontend",
        emptyOutDir: true,
      },
    };
  }
});
