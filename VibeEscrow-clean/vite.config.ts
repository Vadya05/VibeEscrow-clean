import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { Buffer } from "buffer";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
    "globalThis.Buffer": JSON.stringify(Buffer),
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  build: {
    outDir:    "dist",
    sourcemap: false,
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});
