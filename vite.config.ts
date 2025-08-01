import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: ".", // root is project root where index.html lives
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // if you have a src folder, otherwise remove
    },
  },
  build: {
    outDir: "dist", // build output folder
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"), // point to root index.html
    },
  },
});
