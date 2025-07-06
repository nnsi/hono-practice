import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/

export default defineConfig(() => {
  return {
    publicDir: "./public",
    plugins: [tsconfigPaths(), TanStackRouterVite(), react()],
    server: {
      port: Number.parseInt(process.env.VITE_PORT || "5173"),
      host: true,
    },
    build: {
      outDir: "../../dist-frontend",
      emptyOutDir: true,
      rollupOptions: {
        plugins: [visualizer()],
      },
    },
  };
});
