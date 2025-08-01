import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: ".", // root folder is project root
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // '@' points to /src
    },
  },
  build: {
    outDir: "dist", // output directory
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"), // point to root index.html
    },
  },
});
