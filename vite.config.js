import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { cpSync, mkdirSync } from "node:fs";

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: "eleventy-ui-watch-copy",
    writeBundle() {
      // Eleventy correctly ignores Git-ignored build directories while watching.
      // Copy completed bundles directly to the dev server's output in watch mode.
      if (process.env.LAPPIO_UI_WATCH === "1") {
        mkdirSync("_site/ui", { recursive: true });
        cpSync(".ui-build", "_site/ui", { recursive: true });
      }
    },
  }],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  resolve: { alias: { "@": fileURLToPath(new URL("./frontend", import.meta.url)) } },
  build: {
    outDir: ".ui-build",
    emptyOutDir: true,
    minify: true,
    lib: { entry: "frontend/main.jsx", formats: ["es"], fileName: () => "app.js", cssFileName: "app" },
  },
});
