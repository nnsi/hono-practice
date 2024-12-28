import path from "path";

import build from "@hono/vite-build/node";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/

const resolve = {
  alias: {
    "@": path.resolve("./"),
    "@hooks": path.resolve("./frontend/src/hooks"),
    "@components": path.resolve("./frontend/src/components"),
  },
};

export default defineConfig(({ mode }) => {
  if (mode === "server") {
    return {
      test: {
        setupFiles: ["./backend/test.setup.ts"],
      },
      resolve,
      plugins: [
        build({
          entry: "./backend/index.ts",
          outputDir: "./dist-backend",
        }),
      ],
    };
  } else {
    return {
      resolve,
      plugins: [TanStackRouterVite(), react()],
      build: {
        outDir: "dist-frontend",
        emptyOutDir: true,
      },
    };
  }
});
