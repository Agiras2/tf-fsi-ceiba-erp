export type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  productos: number;
};

export type Acciones = { crear: boolean; editar: boolean; eliminar: boolean };
