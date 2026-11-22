export type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  productos: number;
};

export type Acciones = { crear: boolean; editar: boolean; eliminar: boolean };
