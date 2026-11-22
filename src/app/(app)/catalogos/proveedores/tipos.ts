export type Proveedor = {
  id: number;
  nit: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  tiempoEntregaDias: number;
  activo: boolean;
  productos: number;
};

export type Acciones = { crear: boolean; editar: boolean; eliminar: boolean };
