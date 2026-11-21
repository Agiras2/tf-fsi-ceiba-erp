"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function MenuUsuario({ nombre, rol }: { nombre: string; rol: string }) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("No fue posible cerrar la sesión. Intente de nuevo.");
      setSaliendo(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-medium sm:inline">{nombre}</span>
      <Badge variant="secondary">{rol}</Badge>
      <Button variant="ghost" size="sm" onClick={salir} disabled={saliendo}>
        <LogOut className="mr-1 h-4 w-4" aria-hidden />
        Salir
      </Button>
    </div>
  );
}
