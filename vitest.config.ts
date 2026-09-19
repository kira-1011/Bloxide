import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

// Vitest reads this file *instead of* vite.config.ts, not in addition to it,
// so the app config is merged in explicitly — that keeps the `@` alias defined
// in exactly one place.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      // Mocks are restored between tests; a leaked implementation is a whole
      // afternoon of debugging the wrong test.
      restoreMocks: true,
      setupFiles: ["./vitest.setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        // Entry point, ambient types and the config objects they wire together.
        exclude: ["src/main.tsx", "src/vite-env.d.ts"],
      },
    },
  }),
);
