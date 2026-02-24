import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({ root: "../.." }),
    TanStackRouterVite(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^(?!\/(api|auth|users|r2|batch))/],
        runtimeCaching: [
          {
            urlPattern: /\/(users|auth|api)\/.*/,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Actiko",
        short_name: "Actiko",
        start_url: "/",
        scope: "/",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    port: 2460,
    host: true,
  },
  build: {
    outDir: "../../dist-frontend-v2",
    emptyOutDir: true,
    sourcemap: false,
  },
});
