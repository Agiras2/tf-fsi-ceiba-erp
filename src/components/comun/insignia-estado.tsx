import { Badge } from "@/components/ui/badge";

export function InsigniaEstado({ activo }: { activo: boolean }) {
  return <Badge variant={activo ? "secondary" : "outline"}>{activo ? "Activo" : "Inactivo"}</Badge>;
}
