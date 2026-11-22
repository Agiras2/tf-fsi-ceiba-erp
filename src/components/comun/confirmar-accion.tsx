"use client";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Confirmacion antes de una operacion irreversible o sensible (RNF-01). */
export function ConfirmarAccion({
  abierto, onCambio, titulo, descripcion, textoAccion = "Confirmar", onConfirmar,
}: {
  abierto: boolean;
  onCambio: (v: boolean) => void;
  titulo: string;
  descripcion: string;
  textoAccion?: string;
  onConfirmar: () => void;
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={onCambio}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>{textoAccion}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
