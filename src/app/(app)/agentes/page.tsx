// ============================================================
// Agentes de IA: analista de inventario, analista comercial e informe ejecutivo,
// con validacion humana de las recomendaciones (docs/04-REQ RF-36 a RF-41).
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import { PERMISOS_AGENTES, PERMISOS_RECOMENDACIONES } from "@/lib/permisos";
import { ModuloAgentes } from "./modulo-agentes";

export const metadata: Metadata = { title: "Agentes de IA" };

export default async function Pagina() {
  const sesion = await protegerPagina("/agentes");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agentes de IA</h1>
        <p className="text-sm text-muted-foreground">
          Dos agentes con responsabilidades distintas que trabajan sobre los mismos datos del dashboard. La IA interpreta; el sistema calcula y usted decide.
        </p>
      </div>
      <ModuloAgentes
        acciones={{
          ejecutar: (PERMISOS_AGENTES.ejecutar as readonly string[]).includes(sesion.rol),
          decidir: (PERMISOS_RECOMENDACIONES.decidir as readonly string[]).includes(sesion.rol),
        }}
      />
    </div>
  );
}
