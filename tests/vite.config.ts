import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./fixture", import.meta.url)),
  resolve: {
    alias: {
      "@liteyuki/lyf-textmate": fileURLToPath(new URL("../dist/index.js", import.meta.url))
    }
  },
  build: {
    outDir: fileURLToPath(new URL("./vite-dist", import.meta.url)),
    emptyOutDir: true
  }
});
