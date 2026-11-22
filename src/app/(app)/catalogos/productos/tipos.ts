export type Producto = {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  proveedorId: number;
  unidad: string;
  costo: number;
  precio: number;
  activo: boolean;
  categoria: { id: number; nombre: string };
  proveedor: { id: number; nombre: string };
};

export type Opcion = { id: number; nombre: string };

export type Acciones = { crear: boolean; editar: boolean; eliminar: boolean };
