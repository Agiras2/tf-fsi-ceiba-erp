import type { Rol } from "@/lib/navegacion";

export type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  sucursalId: number | null;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
  updatedAt: string;
  sucursal: { id: number; nombre: string } | null;
};

export type OpcionSucursal = { id: number; nombre: string };

export type Acciones = { crear: boolean; editar: boolean; eliminar: boolean };
