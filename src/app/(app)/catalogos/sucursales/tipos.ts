export type Sucursal = {
  id: number;
  codigo: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  activa: boolean;
};

export type Acciones = { crear: boolean; editar: boolean; eliminar: boolean };
