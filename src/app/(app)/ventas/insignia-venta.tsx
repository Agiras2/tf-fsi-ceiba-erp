import { Badge } from "@/components/ui/badge";
import { ETIQUETA_ESTADO_VENTA, type EstadoVenta } from "@/lib/esquemas/ventas";

export function InsigniaVenta({ estado }: { estado: EstadoVenta }) {
  return (
    <Badge variant={estado === "ANULADA" ? "destructive" : "secondary"}>
      {ETIQUETA_ESTADO_VENTA[estado]}
    </Badge>
  );
}
