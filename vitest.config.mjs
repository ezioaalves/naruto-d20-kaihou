import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/wizard/**/*.test.mjs"],
    environment: "node",
    globals: true,
  },
});
