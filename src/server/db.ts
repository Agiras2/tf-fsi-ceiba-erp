// ============================================================
// CeibaERP - Cliente unico de Prisma para la aplicacion
// Usa DATABASE_URL (rol de minimo privilegio ceiba_app).
// ============================================================
import type { PrismaClient } from "@/generated/prisma/client";
import { crearPrismaClient } from "@/server/conexion";

// Instancia unica (evita multiples pools durante el desarrollo con recarga en caliente).
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient; esquemaDb?: string };

function obtenerUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("La variable DATABASE_URL no esta definida.");
  return url;
}

const nuevo = globalParaPrisma.prisma ? null : crearPrismaClient(obtenerUrl());

export const prisma: PrismaClient = globalParaPrisma.prisma ?? nuevo!.prisma;

/** Esquema de la conexion: las consultas SQL directas (KPI) califican las tablas con el. */
export const esquemaDb: string = globalParaPrisma.esquemaDb ?? nuevo!.conf.schema;

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
  globalParaPrisma.esquemaDb = esquemaDb;
}
