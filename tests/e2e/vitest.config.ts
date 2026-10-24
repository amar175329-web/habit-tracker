import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/e2e/**/*.{test,spec}.{ts,tsx}"],
  },
});
