// Tipos de las respuestas del dashboard, derivados del servicio para que no se desincronicen.
import type { Alerta, graficos, ResultadoKpis } from "@/server/servicios/kpi";

export type RespuestaKpis = ResultadoKpis;
export type RespuestaGraficos = Awaited<ReturnType<typeof graficos>>;
export type RespuestaAlertas = { datos: Alerta[]; resumen: { agotados: number; bajoMinimo: number } };
export type { Alerta };

export type Filtros = { desde: string; hasta: string; sucursalId: string; categoriaId: string };
export type Opcion = { id: number; nombre: string };
