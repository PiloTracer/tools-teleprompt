import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    host: true,
    port: Number(process.env.FRONTEND_DEV_PORT) || 5173,
    hmr: process.env.VITE_DEV_HMR_PORT
      ? {
          host: process.env.VITE_DEV_HMR_HOST || "localhost",
          port: Number(process.env.VITE_DEV_HMR_PORT),
        }
      : undefined,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "manifest.webmanifest"],
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
