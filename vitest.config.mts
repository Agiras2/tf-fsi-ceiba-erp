import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      JWT_SECRET: "clave-de-pruebas-unitarias-no-usar-en-produccion-123",
      // Las pruebas unitarias no se conectan: el pool de pg solo abre conexiones al consultar.
      DATABASE_URL: "postgresql://prueba:prueba@localhost:5432/prueba?sslmode=disable",
    },
  },
});
