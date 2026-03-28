import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ root: "../.." }), TanStackRouterVite(), react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: Number(process.env.VITE_PORT) || 2462,
    host: true,
  },
  build: {
    outDir: "../../dist-admin-frontend",
    emptyOutDir: true,
    sourcemap: false,
  },
});
