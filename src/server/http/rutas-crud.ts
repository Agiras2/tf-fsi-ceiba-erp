// ============================================================
// CeibaERP - Fabrica de Route Handlers CRUD (docs/04-REQ seccion 4.2)
// Cada ruta: autentica, autoriza por rol, valida y responde con el
// formato uniforme de errores. La logica vive en los servicios.
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import { requerirRol } from "@/server/auth/autorizacion";
import { ipDeSolicitud } from "@/server/auditoria";
import { ErrorApi, errores, manejarError } from "@/server/errores";
import type { Contexto, ServicioCrud } from "@/server/servicios/comun";
import type { Rol } from "@/lib/navegacion";
import type { PermisosCrud } from "@/lib/permisos";

type ContextoRuta = { params: Promise<{ id: string }> };

export async function contexto(roles: readonly Rol[], req: NextRequest): Promise<Contexto> {
  const sesion = await requerirRol(roles);
  return { sesion, ip: ipDeSolicitud(req.headers) };
}

export async function leerCuerpo(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ErrorApi(400, "CUERPO_INVALIDO", "El cuerpo de la solicitud debe ser JSON válido.");
  }
}

export async function leerId(ctx: ContextoRuta): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw errores.noEncontrado();
  return n;
}

/** GET (listar) y POST (crear) para /api/{recurso}. */
export function rutasColeccion(servicio: ServicioCrud, permisos: PermisosCrud) {
  return {
    async GET(req: NextRequest) {
      try {
        const ctx = await contexto(permisos.leer, req);
        return NextResponse.json(await servicio.listar(req.nextUrl.searchParams, ctx));
      } catch (e) {
        return manejarError(e);
      }
    },
    async POST(req: NextRequest) {
      try {
        const ctx = await contexto(permisos.crear, req);
        return NextResponse.json(await servicio.crear(await leerCuerpo(req), ctx), { status: 201 });
      } catch (e) {
        return manejarError(e);
      }
    },
  };
}

/** GET (detalle), PATCH (editar) y DELETE (eliminar o desactivar) para /api/{recurso}/{id}. */
export function rutasRecurso(servicio: ServicioCrud, permisos: PermisosCrud) {
  return {
    async GET(req: NextRequest, rc: ContextoRuta) {
      try {
        const ctx = await contexto(permisos.leer, req);
        return NextResponse.json(await servicio.obtener(await leerId(rc), ctx));
      } catch (e) {
        return manejarError(e);
      }
    },
    async PATCH(req: NextRequest, rc: ContextoRuta) {
      try {
        const ctx = await contexto(permisos.editar, req);
        return NextResponse.json(await servicio.actualizar(await leerId(rc), await leerCuerpo(req), ctx));
      } catch (e) {
        return manejarError(e);
      }
    },
    async DELETE(req: NextRequest, rc: ContextoRuta) {
      try {
        const ctx = await contexto(permisos.eliminar, req);
        return NextResponse.json(await servicio.eliminar(await leerId(rc), ctx));
      } catch (e) {
        return manejarError(e);
      }
    },
  };
}
