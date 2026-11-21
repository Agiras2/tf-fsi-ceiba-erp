"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot, Boxes, Factory, FileSpreadsheet, LayoutDashboard, MessageSquare, Package, Receipt, ScrollText,
  ShoppingCart, Store, Tags, Truck, UserCog, Users, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONOS: Record<string, LucideIcon> = {
  Bot, Boxes, Factory, FileSpreadsheet, LayoutDashboard, MessageSquare, Package, Receipt, ScrollText,
  ShoppingCart, Store, Tags, Truck, UserCog, Users,
};

type Item = { titulo: string; ruta: string; grupo: string; icono: string };

export function BarraLateral({ items }: { items: Item[] }) {
  const ruta = usePathname();
  const grupos = [...new Set(items.map((i) => i.grupo))];
  // El item activo es el de ruta mas especifica que coincide.
  const activo = [...items]
    .sort((a, b) => b.ruta.length - a.ruta.length)
    .find((i) => ruta === i.ruta || ruta.startsWith(`${i.ruta}/`))?.ruta;

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          CeibaERP
        </Link>
      </div>
      <nav className="space-y-4 p-3" aria-label="Menú principal">
        {grupos.map((g) => (
          <div key={g}>
            <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g}</p>
            <ul className="space-y-0.5">
              {items.filter((i) => i.grupo === g).map((i) => {
                const Icono = ICONOS[i.icono] ?? Package;
                return (
                  <li key={i.ruta}>
                    <Link
                      href={i.ruta}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                        activo === i.ruta && "bg-muted font-medium text-foreground",
                      )}
                    >
                      <Icono className="h-4 w-4" aria-hidden />
                      {i.titulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
