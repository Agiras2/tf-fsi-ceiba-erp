// PRU-U04/U05: validaciones de catalogos y reglas RN-14 y RN-20.
import { describe, expect, it } from "vitest";
import {
  esquemaCliente, esquemaProducto, esquemaProductoEdicion, esquemaProveedor, esquemaUsuario, esquemaUsuarioEdicion,
} from "@/lib/esquemas/catalogos";
import { esquemaListado } from "@/lib/esquemas/comunes";
import { cambios } from "@/server/servicios/comun";
import { accionesPermitidas, puedeLeer } from "@/lib/permisos";

const productoValido = {
  sku: "aba-099", nombre: "Arroz integral 1 kg", categoriaId: "1", proveedorId: "2", unidad: "unidad", costo: "4200", precio: "5600",
};

describe("Producto", () => {
  it("normaliza el SKU, convierte numeros de formulario y vacia la descripcion", () => {
    const r = esquemaProducto.parse({ ...productoValido, descripcion: "   " });
    expect(r).toMatchObject({ sku: "ABA-099", categoriaId: 1, proveedorId: 2, costo: 4200, precio: 5600, descripcion: null });
  });

  it("RN-14: rechaza precio menor que el costo, en el campo precio", () => {
    const r = esquemaProducto.safeParse({ ...productoValido, precio: "4000" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["precio"]);
  });

  it("rechaza campos no declarados, costo cero y mas de 2 decimales", () => {
    expect(esquemaProducto.safeParse({ ...productoValido, stock: 10 }).success).toBe(false);
    expect(esquemaProducto.safeParse({ ...productoValido, costo: "0" }).success).toBe(false);
    expect(esquemaProducto.safeParse({ ...productoValido, costo: "10.123" }).success).toBe(false);
  });

  it("la edicion admite datos parciales", () => {
    expect(esquemaProductoEdicion.parse({ precio: 7000 })).toEqual({ precio: 7000 });
  });
});

describe("Proveedor y cliente", () => {
  it("valida NIT, tiempo de entrega y correo opcional", () => {
    const base = { nit: "900123456-7", nombre: "Proveedor Prueba", tiempoEntregaDias: "3", email: "" };
    expect(esquemaProveedor.parse(base)).toMatchObject({ tiempoEntregaDias: 3, email: null });
    expect(esquemaProveedor.safeParse({ ...base, nit: "ABC" }).success).toBe(false);
    expect(esquemaProveedor.safeParse({ ...base, tiempoEntregaDias: "0" }).success).toBe(false);
  });

  it("el documento del cliente solo admite numeros", () => {
    expect(esquemaCliente.safeParse({ documento: "1020304050", nombre: "Ana Pérez" }).success).toBe(true);
    expect(esquemaCliente.safeParse({ documento: "CC-10203", nombre: "Ana Pérez" }).success).toBe(false);
  });
});

describe("Usuario", () => {
  const usuario = { nombre: "Nuevo Cajero", email: "Nuevo@Ceiba.test", rol: "CAJERO", sucursalId: "3", password: "ClaveSegura2026" };

  it("RN-20: cajero y bodega requieren sucursal", () => {
    expect(esquemaUsuario.parse(usuario)).toMatchObject({ email: "nuevo@ceiba.test", sucursalId: 3 });
    expect(esquemaUsuario.safeParse({ ...usuario, sucursalId: "" }).success).toBe(false);
  });

  it("RN-20: administrador y gerente no tienen sucursal", () => {
    expect(esquemaUsuario.safeParse({ ...usuario, rol: "GERENTE" }).success).toBe(false);
    expect(esquemaUsuario.safeParse({ ...usuario, rol: "GERENTE", sucursalId: "" }).success).toBe(true);
  });

  it("exige contrasena de 10 caracteres con letras y numeros", () => {
    expect(esquemaUsuario.safeParse({ ...usuario, password: "corta1" }).success).toBe(false);
    expect(esquemaUsuario.safeParse({ ...usuario, password: "SoloLetrasLarga" }).success).toBe(false);
  });

  it("la edicion no permite enviar el hash ni campos desconocidos", () => {
    expect(esquemaUsuarioEdicion.safeParse({ passwordHash: "x" }).success).toBe(false);
  });
});

describe("Utilidades", () => {
  it("aplica valores por defecto al listado y limita el tamano", () => {
    expect(esquemaListado.parse({})).toEqual({ q: "", pagina: 1, tamano: 20, activo: "todos" });
    expect(esquemaListado.safeParse({ tamano: "500" }).success).toBe(false);
  });

  it("detecta solo los campos que cambiaron", () => {
    expect(cambios({ nombre: "A", activo: true }, { nombre: "B", activo: true })).toEqual({ nombre: { antes: "A", despues: "B" } });
  });
});

describe("Permisos de catalogos (DEF-01)", () => {
  it("el cajero consulta productos pero no categorias ni proveedores", () => {
    expect(puedeLeer("productos", "CAJERO")).toBe(true);
    expect(puedeLeer("categorias", "CAJERO")).toBe(false);
    expect(puedeLeer("proveedores", "CAJERO")).toBe(false);
  });

  it("el cajero crea clientes pero no los edita ni elimina", () => {
    expect(accionesPermitidas("clientes", "CAJERO")).toEqual({ crear: true, editar: false, eliminar: false });
  });
});
