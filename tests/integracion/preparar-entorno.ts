// ============================================================
// Se ejecuta antes de cada archivo de pruebas de integracion: apunta la aplicacion
// al esquema "test" (DATABASE_URL_TEST) y se niega a correr contra cualquier otro,
// para no tocar nunca los datos de demostracion (docs/10-PRU seccion 1).
// No imprime la cadena de conexion.
// ============================================================
import { config } from "dotenv";

config({ quiet: true });
const url = process.env.DATABASE_URL_TEST;
if (!url) {
  throw new Error("Defina DATABASE_URL_TEST en el archivo .env para ejecutar las pruebas de integracion.");
}
let esquema: string | null = null;
try {
  esquema = new URL(url).searchParams.get("schema");
} catch {
  throw new Error("DATABASE_URL_TEST no es una URL valida.");
}
if (esquema !== "test") {
  throw new Error(`Las pruebas de integracion solo se ejecutan contra el esquema "test" (DATABASE_URL_TEST tiene schema=${esquema ?? "ninguno"}).`);
}
process.env.DATABASE_URL = url;
