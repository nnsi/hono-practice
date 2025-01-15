import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/

export default defineConfig(({ mode }) => {
  return {
    publicDir: "frontend/public",
    plugins: [tsconfigPaths(), TanStackRouterVite(), react()],
    define: {
      "process.env.NODE_ENV":
        mode === "stg" || mode === "production"
          ? JSON.stringify("production")
          : JSON.stringify("development"),
    },
    build: {
      outDir: "dist-frontend",
      emptyOutDir: true,
      rollupOptions: {
        plugins: [visualizer()],
      },
    },
  };
});
