/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "/src" is resolved from the project root, so this needs no node types.
  resolve: { alias: { "@": "/src" } },
  // Blockly ships UMD, not ESM.
  optimizeDeps: { include: ["blockly"] },
  test: {
    environment: "jsdom",
    // Mocks are restored between tests; a leaked implementation is a whole
    // afternoon of debugging the wrong test.
    restoreMocks: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      // Entry point, ambient types and the config objects they wire together.
      exclude: ["src/main.tsx", "src/vite-env.d.ts", "src/test/**"],
    },
  },
});
