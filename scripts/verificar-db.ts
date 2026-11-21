// ============================================================
// CeibaERP - Verificacion de la conexion y de los privilegios del rol de la aplicacion
// Uso: npm run db:verificar
// No imprime cadenas de conexion ni contrasenas.
// ============================================================
import "dotenv/config";
import { crearPrismaClient } from "../src/server/conexion";

const TABLAS_ESPERADAS = [
  "auditoria", "categoria", "cliente", "conversacion", "detalle_orden_compra", "detalle_venta",
  "ejecucion_agente", "inventario", "mensaje_chat", "movimiento_inventario", "orden_compra",
  "producto", "proveedor", "recomendacion", "sucursal", "usuario", "venta",
];

async function verificar(nombre: string, variable: string): Promise<boolean> {
  const url = process.env[variable];
  if (!url) {
    console.log(`\n[${nombre}] Variable ${variable} no definida: se omite.`);
    return true;
  }
  const { prisma, conf } = crearPrismaClient(url);
  let ok = true;
  console.log(`\n[${nombre}] esquema="${conf.schema}" tls="${conf.modoSsl}"`);
  try {
    const [quien] = await prisma.$queryRawUnsafe<{ usuario: string }[]>("SELECT current_user AS usuario");
    console.log(`  Conectado como: ${quien.usuario}`);

    const tablas = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
      conf.schema,
    );
    const nombres = new Set(tablas.map((t) => t.table_name));
    const faltantes = TABLAS_ESPERADAS.filter((t) => !nombres.has(t));
    console.log(`  Tablas del modelo encontradas: ${TABLAS_ESPERADAS.length - faltantes.length}/${TABLAS_ESPERADAS.length}`);
    if (faltantes.length > 0) {
      ok = false;
      console.log(`  FALTAN: ${faltantes.join(", ")}`);
    }

    const sucursales = await prisma.sucursal.count();
    console.log(`  Lectura con Prisma (sucursal.count): ${sucursales} -> OK`);

    const [checks] = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
      "SELECT COUNT(*) AS total FROM information_schema.table_constraints WHERE constraint_schema = $1 AND constraint_type = 'CHECK' AND constraint_name NOT LIKE '%_not_null'",
      conf.schema,
    );
    console.log(`  Restricciones CHECK del modelo: ${checks.total}`);

    try {
      await prisma.$executeRawUnsafe(`CREATE TABLE "${conf.schema}".prueba_minimo_privilegio (id int)`);
      ok = false;
      console.log("  ALERTA: el rol de la aplicacion pudo crear una tabla (no deberia).");
      await prisma.$executeRawUnsafe(`DROP TABLE "${conf.schema}".prueba_minimo_privilegio`);
    } catch (e) {
      const mensaje = (e as Error).message.replace(/\s+/g, " ").trim().slice(0, 150);
      console.log(`  CREATE TABLE rechazado para el rol de la aplicacion -> OK (minimo privilegio)`);
      console.log(`    Motivo: ${mensaje}`);
    }
  } catch (e) {
    ok = false;
    console.log(`  ERROR: ${(e as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }
  return ok;
}

async function main() {
  const a = await verificar("demo", "DATABASE_URL");
  const b = await verificar("pruebas", "DATABASE_URL_TEST");
  console.log(a && b ? "\nResultado: TODO OK" : "\nResultado: HAY PROBLEMAS");
  process.exit(a && b ? 0 : 1);
}

void main();
