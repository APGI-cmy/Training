import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "server-only": fileURLToPath(new URL("./tests/scannex/server-only.ts", import.meta.url)) } },
  test: { include: ["tests/scannex/**/*.spec.ts"], environment: "node" }
});
