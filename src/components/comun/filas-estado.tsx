import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

/** Filas de la tabla mientras carga, sin resultados o con error. */
export function FilasEstado({ columnas, cargando, error, vacio, filas = 5 }: { columnas: number; cargando: boolean; error: string | null; vacio: boolean; filas?: number }) {
  if (cargando && vacio) {
    return Array.from({ length: filas }, (_, i) => (
      <TableRow key={i}>
        <TableCell colSpan={columnas}>
          <Skeleton className="h-5 w-full" />
        </TableCell>
      </TableRow>
    ));
  }
  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={columnas} className="py-8 text-center text-destructive">
          {error}
        </TableCell>
      </TableRow>
    );
  }
  if (vacio) {
    return (
      <TableRow>
        <TableCell colSpan={columnas} className="py-8 text-center text-muted-foreground">
          No hay registros que coincidan con la búsqueda.
        </TableCell>
      </TableRow>
    );
  }
  return null;
}
