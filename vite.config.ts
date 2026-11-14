import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps every asset URL relative, so the export works at an IPFS gateway subpath or an ENS name.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { "process.env": {}, global: "globalThis" },
  resolve: { alias: { buffer: "buffer/" } },
  build: { outDir: "dist", sourcemap: false, chunkSizeWarningLimit: 4000 },
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx}"], globals: false, setupFiles: ["tests/setup.ts"] },
} as any);
