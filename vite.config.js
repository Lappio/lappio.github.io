import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  resolve: { alias: { "@": fileURLToPath(new URL("./frontend", import.meta.url)) } },
  build: {
    outDir: ".ui-build",
    emptyOutDir: true,
    minify: true,
    lib: { entry: "frontend/main.jsx", formats: ["es"], fileName: () => "app.js", cssFileName: "app" },
  },
});
