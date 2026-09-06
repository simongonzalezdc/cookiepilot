import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local dev proxies. In production these same paths are rewritten at the host edge
// (vercel.json / netlify.toml / public/_redirects) so the browser never hits
// swap.cookiescan.io directly (it sends no CORS headers) and api calls stay origin-relative.
export default defineConfig({
  // GH Pages serves under /cookiepilot/ (set VITE_BASE=/cookiepilot/ for that build);
  // Netlify/Vercel serve at the domain root (default "/").
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: {
    port: 5183,
    proxy: {
      "/explorer-api": {
        target: "https://cookiescan.io",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/explorer-api/, "/api"),
      },
      "/swap-api": {
        target: "https://swap.cookiescan.io",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/swap-api/, "/api"),
      },
      "/agg-api": {
        target: "https://agg.cookiebox.app",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/agg-api/, ""),
      },
      "/chain-api": {
        target: "https://api.cookiescan.io",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/chain-api/, ""),
      },
    },
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1200,
  },
  // same proxies for `vite preview` so the production build is fully exercisable locally
  preview: {
    port: 4173,
    proxy: {
      "/explorer-api": {
        target: "https://cookiescan.io",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/explorer-api/, "/api"),
      },
      "/swap-api": {
        target: "https://swap.cookiescan.io",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/swap-api/, "/api"),
      },
      "/agg-api": {
        target: "https://agg.cookiebox.app",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/agg-api/, ""),
      },
      "/chain-api": {
        target: "https://api.cookiescan.io",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/chain-api/, ""),
      },
    },
  },
});
