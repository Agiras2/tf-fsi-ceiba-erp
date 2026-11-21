// PRU-U08 (permisos) y pruebas de sesion, limitador y validacion de login.
import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { firmarSesion, verificarToken } from "@/server/auth/sesion";
import { Limitador } from "@/server/auth/limitador";
import { esquemaLogin } from "@/server/validacion/auth";
import { INICIO_POR_ROL, menuParaRol, puedeAcceder, ROLES } from "@/lib/navegacion";

describe("Sesion JWT", () => {
  it("firma y verifica una sesion valida", async () => {
    const token = await firmarSesion({ usuarioId: 7, nombre: "Prueba", rol: "CAJERO", sucursalId: 2 });
    expect(await verificarToken(token)).toEqual({ usuarioId: 7, nombre: "Prueba", rol: "CAJERO", sucursalId: 2 });
  });

  it("rechaza un token con la firma alterada (PRU-S11)", async () => {
    const token = await firmarSesion({ usuarioId: 1, nombre: "A", rol: "ADMIN", sucursalId: null });
    const partes = token.split(".");
    const alterado = `${partes[0]}.${partes[1]}.${partes[2].slice(0, -2)}xx`;
    expect(await verificarToken(alterado)).toBeNull();
  });

  it("rechaza un token firmado con otra clave o con un rol inexistente", async () => {
    const otraClave = new TextEncoder().encode("otra-clave-distinta-de-al-menos-32-caracteres");
    const ajeno = await new SignJWT({ rol: "ADMIN" }).setProtectedHeader({ alg: "HS256" }).setSubject("1").sign(otraClave);
    expect(await verificarToken(ajeno)).toBeNull();
    const clave = new TextEncoder().encode(process.env.JWT_SECRET);
    const rolFalso = await new SignJWT({ rol: "SUPERUSUARIO" }).setProtectedHeader({ alg: "HS256" }).setSubject("1").sign(clave);
    expect(await verificarToken(rolFalso)).toBeNull();
  });

  it("rechaza tokens vacios", async () => {
    expect(await verificarToken(undefined)).toBeNull();
    expect(await verificarToken("no-es-un-jwt")).toBeNull();
  });
});

describe("Limitador de intentos", () => {
  it("bloquea despues de 5 fallos y se libera al vencer la ventana", () => {
    let t = 0;
    const lim = new Limitador(5, 1000, () => t);
    for (let i = 0; i < 4; i++) lim.registrarFallo("a");
    expect(lim.estaBloqueado("a")).toBe(false);
    lim.registrarFallo("a");
    expect(lim.estaBloqueado("a")).toBe(true);
    expect(lim.estaBloqueado("b")).toBe(false);
    t = 1001;
    expect(lim.estaBloqueado("a")).toBe(false);
  });

  it("limpia los fallos tras un inicio de sesion exitoso", () => {
    const lim = new Limitador();
    for (let i = 0; i < 5; i++) lim.registrarFallo("x");
    lim.limpiar("x");
    expect(lim.estaBloqueado("x")).toBe(false);
  });
});

describe("Validacion de login", () => {
  it("normaliza el correo y acepta datos validos", () => {
    expect(esquemaLogin.parse({ email: "  Gerente@Ceiba.TEST ", password: "x" }).email).toBe("gerente@ceiba.test");
  });

  it("rechaza campos no declarados y correos invalidos", () => {
    expect(esquemaLogin.safeParse({ email: "a@b.co", password: "x", rol: "ADMIN" }).success).toBe(false);
    expect(esquemaLogin.safeParse({ email: "no-es-correo", password: "x" }).success).toBe(false);
    expect(esquemaLogin.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("Permisos por rol (PRU-U08, docs/03-NEG seccion 4.1)", () => {
  it("cada rol tiene acceso a su pagina de inicio", () => {
    for (const rol of ROLES) expect(puedeAcceder(rol, INICIO_POR_ROL[rol])).toBe(true);
  });

  it("solo el administrador ve usuarios y auditoria", () => {
    expect(puedeAcceder("ADMIN", "/usuarios")).toBe(true);
    for (const rol of ["GERENTE", "BODEGA", "CAJERO"] as const) {
      expect(puedeAcceder(rol, "/usuarios")).toBe(false);
      expect(puedeAcceder(rol, "/auditoria")).toBe(false);
    }
  });

  it("el cajero no accede al dashboard, compras ni agentes", () => {
    for (const ruta of ["/dashboard", "/compras", "/agentes"]) expect(puedeAcceder("CAJERO", ruta)).toBe(false);
  });

  it("la bodega no registra ventas ni ejecuta agentes", () => {
    expect(puedeAcceder("BODEGA", "/ventas/caja")).toBe(false);
    expect(puedeAcceder("BODEGA", "/agentes")).toBe(false);
  });

  it("las rutas desconocidas se niegan por defecto", () => {
    expect(puedeAcceder("ADMIN", "/ruta-inexistente")).toBe(false);
  });

  it("el menu de cada rol solo contiene rutas permitidas", () => {
    for (const rol of ROLES) for (const item of menuParaRol(rol)) expect(puedeAcceder(rol, item.ruta)).toBe(true);
  });
});
