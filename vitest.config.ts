import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify("0.0.0-test"),
  },
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/globals.d.ts"],
    },
  },
});
