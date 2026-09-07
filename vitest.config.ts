import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./") },
      {
        find: /^next\/server$/,
        replacement: path.resolve(__dirname, "./node_modules/next/server.js"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules/**", ".agents/**", ".next/**", "dist/**"],
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
    passWithNoTests: true,
  },
});
