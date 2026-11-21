import { Label } from "@/components/ui/label";

/** Etiqueta + control + mensaje de error, para formularios consistentes. */
export function Campo({
  id, etiqueta, error, ayuda, children, className,
}: { id: string; etiqueta: string; error?: string; ayuda?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda && !error && <p className="text-xs text-muted-foreground">{ayuda}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
