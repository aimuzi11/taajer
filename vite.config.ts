import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: ".", // project root with index.html and main.tsx
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"), // root index.html
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // optional if you have src folder, else remove
    },
  },
});
