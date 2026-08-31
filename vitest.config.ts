import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "**/__tests__/**/*.comprehensive.test.ts",
      "**/__tests__/**/*.edge.test.ts",
      "**/__tests__/**/*.integration.test.ts",
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: [
      { find: "@/data", replacement: path.resolve(__dirname, "./src/data") },
      { find: "@", replacement: path.resolve(__dirname, "./") },
    ],
  },
});
