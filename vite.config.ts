import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "/src" is resolved from the project root, so this needs no node types.
  resolve: { alias: { "@": "/src" } },
  // Blockly ships UMD, not ESM.
  optimizeDeps: { include: ["blockly"] },
});
