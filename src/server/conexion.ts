// ============================================================
// CeibaERP - Creacion de conexiones a PostgreSQL (Prisma + pg)
// Soporta el parametro schema=... (esquema de pruebas) y TLS verificado.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type ModoSsl = "verificado" | "cifrado-sin-verificar" | "sin-cifrado";

export type ConfigConexion = {
  connectionString: string;
  schema: string;
  ssl: { ca: string; rejectUnauthorized: true } | { rejectUnauthorized: false } | false;
  modoSsl: ModoSsl;
};

const NOMBRE_ESQUEMA_VALIDO = /^[a-z_][a-z0-9_]*$/;

/**
 * Prepara la configuracion de conexion a partir de una URL de Postgres.
 * - Extrae el esquema (parametro "schema", por defecto "public").
 * - Elimina "sslmode" de la URL para controlar TLS desde el codigo:
 *   - sslmode=disable: sin TLS (solo para una base local de desarrollo);
 *   - si existe el certificado raiz de Supabase (certs/supabase-ca.crt),
 *     se verifica el servidor;
 *   - si no, se cifra la conexion sin verificar el certificado.
 */
export function prepararConexion(urlTexto: string): ConfigConexion {
  const url = new URL(urlTexto);
  const schema = url.searchParams.get("schema") ?? "public";
  if (!NOMBRE_ESQUEMA_VALIDO.test(schema)) {
    throw new Error("Nombre de esquema no valido en la URL de conexion.");
  }
  const sslmode = url.searchParams.get("sslmode");
  url.searchParams.delete("schema");
  url.searchParams.delete("sslmode");

  if (sslmode === "disable") {
    return { connectionString: url.toString(), schema, ssl: false, modoSsl: "sin-cifrado" };
  }

  const rutaCa = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DB_SSL_CA_PATH ?? "certs/supabase-ca.crt");
  if (fs.existsSync(rutaCa)) {
    return {
      connectionString: url.toString(),
      schema,
      ssl: { ca: fs.readFileSync(rutaCa, "utf8"), rejectUnauthorized: true },
      modoSsl: "verificado",
    };
  }
  return {
    connectionString: url.toString(),
    schema,
    ssl: { rejectUnauthorized: false },
    modoSsl: "cifrado-sin-verificar",
  };
}

/**
 * Crea un cliente Prisma sobre un pool pg.
 * El adaptador aplica el esquema a las consultas generadas por Prisma.
 * Las consultas SQL directas ($queryRaw, KPI) deben calificar las tablas
 * con el esquema de la conexion (conf.schema).
 */
export function crearPrismaClient(urlTexto: string): { prisma: PrismaClient; conf: ConfigConexion } {
  const conf = prepararConexion(urlTexto);
  const pool = new Pool({
    connectionString: conf.connectionString,
    ssl: conf.ssl,
    max: 5,
    // DEF-05: abrir una conexion TLS nueva hacia Supabase puede tardar varios segundos
    // (p. ej. tras esperar al modelo de IA). Se fija un limite claro para conectar y se
    // mantienen las conexiones vivas un poco mas que el valor por defecto (10 s).
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });
  const adapter = new PrismaPg(pool, { schema: conf.schema });
  // Por defecto Prisma espera solo 2 s para iniciar una transaccion (incluidas las internas
  // de las escrituras anidadas); con una conexion nueva y lejana eso no alcanza.
  const prisma = new PrismaClient({ adapter, transactionOptions: { maxWait: 10_000, timeout: 15_000 } });
  return { prisma, conf };
}
