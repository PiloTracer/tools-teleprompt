import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const devPort = Number(process.env.FRONTEND_DEV_PORT) || 5173;
const hmrClientHost = process.env.VITE_DEV_HMR_HOST?.trim();
const hmrClientPort = process.env.VITE_DEV_HMR_PORT?.trim();

export default defineConfig({
  server: {
    host: true,
    port: devPort,
    allowedHosts: true,
    // clientPort/host = what the browser connects to (host-mapped / LAN).
    // Do NOT set hmr.port to the host port — that makes Vite bind 10.42.0.1:9173 inside Docker (EADDRNOTAVAIL).
    hmr: hmrClientPort
      ? {
          host: hmrClientHost || "localhost",
          clientPort: Number(hmrClientPort),
        }
      : undefined,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icon.svg", "manifest.webmanifest"],
      manifest: {
        name: "tools-teleprompt",
        short_name: "teleprompt",
        description: "Browser-based teleprompter for any device",
        theme_color: "#1a1a1a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,webmanifest,woff2}"],
        navigateFallback: "index.html",
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
  },
});
