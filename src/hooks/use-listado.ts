"use client";
// ============================================================
// CeibaERP - Hook de listados paginados con busqueda y filtros
// Uso: const l = useListado<Producto>("/api/productos", { activo: "true" });
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ErrorCliente } from "@/lib/api-cliente";
import type { Pagina } from "@/lib/esquemas/comunes";

export type EstadoListado<T> = {
  datos: T[];
  total: number;
  pagina: number;
  tamano: number;
  cargando: boolean;
  error: string | null;
  busqueda: string;
  filtros: Record<string, string>;
  setBusqueda: (q: string) => void;
  setFiltro: (nombre: string, valor: string) => void;
  setPagina: (p: number) => void;
  recargar: () => void;
};

type Resultado<T> = { clave: string; datos: T[]; total: number; error: string | null };

export function useListado<T>(url: string, filtrosIniciales: Record<string, string> = {}, tamano = 20): EstadoListado<T> {
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusquedaInterna] = useState("");
  const [q, setQ] = useState("");
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [version, setVersion] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T>>({ clave: "", datos: [], total: 0, error: null });
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clave de la consulta actual: cuando cambia, se pide de nuevo al servidor.
  const consulta = useMemo(
    () => `${url}?${new URLSearchParams({ ...filtros, q, pagina: String(pagina), tamano: String(tamano) })}`,
    [url, filtros, q, pagina, tamano],
  );
  const clave = `${consulta}#${version}`;

  useEffect(() => {
    let cancelado = false;
    api<Pagina<T>>(consulta)
      .then((r) => {
        if (!cancelado) setResultado({ clave, datos: r.datos, total: r.total, error: null });
      })
      .catch((e: unknown) => {
        const error = e instanceof ErrorCliente ? e.message : "No fue posible cargar los datos.";
        if (!cancelado) setResultado((prev) => ({ ...prev, clave, error }));
      });
    return () => {
      cancelado = true;
    };
  }, [consulta, clave]);

  // La busqueda espera 300 ms despues de la ultima tecla.
  const setBusqueda = useCallback((valor: string) => {
    setBusquedaInterna(valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setQ(valor);
      setPagina(1);
    }, 300);
  }, []);

  const setFiltro = useCallback((nombre: string, valor: string) => {
    setFiltros((f) => ({ ...f, [nombre]: valor }));
    setPagina(1);
  }, []);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  return {
    datos: resultado.datos,
    total: resultado.total,
    pagina,
    tamano,
    cargando: resultado.clave !== clave,
    error: resultado.error,
    busqueda,
    filtros,
    setBusqueda,
    setFiltro,
    setPagina,
    recargar,
  };
}
