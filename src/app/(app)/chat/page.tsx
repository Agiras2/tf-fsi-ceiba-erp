// ============================================================
// Asistente (chatbot) con IA sobre los datos reales del sistema
// (docs/04-REQ RF-31 a RF-35, docs/07-IAG seccion 4)
// ============================================================
import type { Metadata } from "next";
import { protegerPagina } from "@/server/auth/autorizacion";
import type { Rol } from "@/lib/navegacion";
import { ModuloChat } from "./modulo-chat";

export const metadata: Metadata = { title: "Asistente (chatbot)" };

/** Preguntas sugeridas segun lo que cada rol puede consultar (docs/07-IAG secciones 3 y 4.3). */
const SUGERENCIAS: Record<Rol, string[]> = {
  CAJERO: [
    "¿Cuál es el precio y el stock del arroz?",
    "¿Cuáles son los productos con mayor volumen de ventas?",
    "¿Qué productos presentan riesgo de agotamiento?",
  ],
  BODEGA: [
    "¿Qué productos presentan riesgo de agotamiento?",
    "¿Qué órdenes de compra tengo pendientes?",
    "¿Qué productos tienen baja rotación?",
    "¿Qué tan puntuales han sido los proveedores este mes?",
  ],
  GERENTE: [
    "¿Cuáles son los productos con mayor volumen de ventas?",
    "¿Qué productos presentan riesgo de agotamiento?",
    "¿Qué sucursal tiene el menor nivel de ventas?",
    "¿Qué proveedores tienen pedidos pendientes?",
    "¿Cómo van los indicadores frente al periodo anterior?",
    "¿Qué recomendó el último informe ejecutivo?",
  ],
  ADMIN: [
    "¿Cómo van los indicadores frente al periodo anterior?",
    "¿Qué sucursal tiene el menor nivel de ventas?",
    "¿Qué productos presentan riesgo de agotamiento?",
    "¿Qué categorías tienen el menor margen?",
  ],
};

export default async function Pagina() {
  const sesion = await protegerPagina("/chat");
  const alcance = sesion.sucursalId === null
    ? "Puede consultar todas las sucursales."
    : `Sus consultas se limitan a ${sesion.sucursalNombre}.`;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asistente (chatbot)</h1>
        <p className="text-sm text-muted-foreground">
          Preguntas en lenguaje natural respondidas con datos reales de CeibaERP mediante herramientas de solo lectura. Las cifras
          provienen del mismo servicio que el dashboard.
        </p>
      </div>
      <ModuloChat sugerencias={SUGERENCIAS[sesion.rol]} alcance={alcance} />
    </div>
  );
}
