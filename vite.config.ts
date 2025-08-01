import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  root: ".", // use root folder instead of /client
  build: {
    outDir: "dist", // adjust as needed
    emptyOutDir: true,
  },
});
