// ============================================================
// CeibaERP - Configuracion de Prisma CLI (Prisma 7)
// - Migraciones: rol "prisma" mediante DIRECT_URL (solo en el equipo del desarrollador).
// - Con PRISMA_TARGET=test se apunta al esquema de pruebas (DIRECT_URL_TEST).
// - "prisma generate" no necesita conexion: en Railway no existe DIRECT_URL
//   y la aplicacion desplegada no puede alterar el esquema.
// La aplicacion se conecta con DATABASE_URL (src/server/db.ts).
// ============================================================
import "dotenv/config";
import { defineConfig } from "prisma/config";

const destinoPruebas = process.env.PRISMA_TARGET === "test";
const url = destinoPruebas ? process.env.DIRECT_URL_TEST : process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
