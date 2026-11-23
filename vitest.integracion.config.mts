// ============================================================
// CeibaERP - Pruebas de integracion contra el esquema "test" (docs/10-PRU seccion 3)
// Uso: npm run test:integracion   (requiere DATABASE_URL_TEST con schema=test en .env)
// Los archivos se ejecutan uno tras otro: cada uno borra y recrea sus datos de prueba.
// ============================================================
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integracion/**/*.test.ts"],
    setupFiles: ["tests/integracion/preparar-entorno.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    env: {
      JWT_SECRET: "clave-de-pruebas-de-integracion-no-usar-en-produccion-123",
      // Las pruebas usan modelos simulados: nunca llaman a Gemini ni gastan cuota.
      GEMINI_API_KEY: "",
    },
  },
});
