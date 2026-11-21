export type Cliente = {
  id: number;
  documento: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
};

export type Acciones = { crear: boolean; editar: boolean; eliminar: boolean };
