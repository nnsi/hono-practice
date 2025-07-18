import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  publicDir: "./public",
  plugins: [
    tsconfigPaths() as any,
    TanStackRouterVite() as any,
    react() as any,
  ],
  server: {
    port: Number.parseInt(process.env.VITE_PORT || "5173"),
    host: true,
  },
  build: {
    outDir: "../../dist-frontend",
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test.setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
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
});
