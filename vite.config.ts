import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@ui": path.resolve(__dirname, "./frontend/src/components/ui"),
    },
  },
  plugins: [TanStackRouterVite(), react()],
});
