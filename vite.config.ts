import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [
    react(),

    // 🔔 PWA plugin (manifest only - Firebase handles service worker)
    VitePWA({
      // Disable service worker generation - Firebase provides its own
      injectRegister: false,
      workbox: {
        // Don't generate service worker
        globPatterns: [],
      },
      includeAssets: ["favicon.png", "favicon.ico"],
      manifest: {
        name: "R-Vault",
        short_name: "R-Vault",
        description: "Secure chat application",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/favicon.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),

    // keep this EXACTLY as you had it
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
