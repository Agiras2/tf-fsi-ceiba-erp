// ============================================================
// CeibaERP - Proxy de Next.js 16 (antes "middleware")
// Primera barrera: redirige a /login las paginas sin sesion valida y
// responde 401 a las API protegidas. La autorizacion por rol se repite
// en el servidor (docs/09-SEG seccion 2).
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarToken } from "@/server/auth/sesion";

const RUTAS_PUBLICAS = ["/login", "/api/auth/login", "/api/health"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return NextResponse.next();
  }

  const sesion = await verificarToken(request.cookies.get(COOKIE_SESION)?.value);
  if (sesion) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { codigo: "NO_AUTENTICADO", mensaje: "Debe iniciar sesión para continuar.", detalles: [] } },
      { status: 401 },
    );
  }
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("destino", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Excluye archivos estaticos e imagenes optimizadas.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
