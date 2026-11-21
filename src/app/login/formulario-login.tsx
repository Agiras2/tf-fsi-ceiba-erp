"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Errores = { email?: string; password?: string; general?: string };

export function FormularioLogin({ destino }: { destino: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const nuevos: Errores = {};
    if (!email.trim()) nuevos.email = "Ingrese su correo.";
    if (!password) nuevos.password = "Ingrese su contraseña.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const cuerpo = await res.json();
      if (!res.ok) {
        const detalles: { campo: string; mensaje: string }[] = cuerpo?.error?.detalles ?? [];
        const porCampo: Errores = {};
        for (const d of detalles) if (d.campo === "email" || d.campo === "password") porCampo[d.campo] = d.mensaje;
        setErrores({ ...porCampo, general: cuerpo?.error?.mensaje ?? "No fue posible iniciar sesión." });
        return;
      }
      router.replace(destino ?? cuerpo.inicio);
      router.refresh();
    } catch {
      setErrores({ general: "No hay conexión con el servidor. Intente de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Ingrese con su correo corporativo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email" type="email" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errores.email} disabled={enviando}
              placeholder="usuario@ceiba.test"
            />
            {errores.email && <p className="text-sm text-destructive">{errores.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errores.password} disabled={enviando}
            />
            {errores.password && <p className="text-sm text-destructive">{errores.password}</p>}
          </div>
          {errores.general && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              {errores.general}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ingresar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
