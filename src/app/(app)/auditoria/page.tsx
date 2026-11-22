// ============================================================
// Auditoria: registro de operaciones del sistema (docs/04-REQ RF-04, RF-05)
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { servicioAuditoria } from "@/server/servicios/auditoria";
import { ModuloAuditoria } from "./modulo-auditoria";

export const metadata: Metadata = { title: "Auditoría" };

export default async function Pagina() {
  await protegerPagina("/auditoria");
  const entidades = await servicioAuditoria.entidades();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro de inicios de sesión, cambios en catálogos, ajustes de inventario y demás operaciones, del más reciente al más antiguo.
        </p>
      </div>
      <ModuloAuditoria entidades={entidades} />
    </div>
  );
}
