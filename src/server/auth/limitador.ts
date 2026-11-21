// ============================================================
// CeibaERP - Limitador de intentos fallidos de inicio de sesion
// 5 fallos por correo + IP en 15 minutos -> bloqueo temporal (429).
// En memoria: suficiente para una sola instancia (docs/09-SEG seccion 9).
// ============================================================

export const MAX_FALLOS = 5;
export const VENTANA_MS = 15 * 60 * 1000;

type Registro = { fallos: number; inicio: number };

export class Limitador {
  private readonly registros = new Map<string, Registro>();

  constructor(
    private readonly maxFallos = MAX_FALLOS,
    private readonly ventanaMs = VENTANA_MS,
    private readonly ahora: () => number = Date.now,
  ) {}

  private vigente(clave: string): Registro | undefined {
    const r = this.registros.get(clave);
    if (r && this.ahora() - r.inicio > this.ventanaMs) {
      this.registros.delete(clave);
      return undefined;
    }
    return r;
  }

  estaBloqueado(clave: string): boolean {
    const r = this.vigente(clave);
    return !!r && r.fallos >= this.maxFallos;
  }

  registrarFallo(clave: string): void {
    const r = this.vigente(clave);
    if (r) r.fallos += 1;
    else this.registros.set(clave, { fallos: 1, inicio: this.ahora() });
  }

  limpiar(clave: string): void {
    this.registros.delete(clave);
  }
}

const globalLimitador = globalThis as unknown as { limitadorLogin?: Limitador };
export const limitadorLogin = globalLimitador.limitadorLogin ?? new Limitador();
globalLimitador.limitadorLogin = limitadorLogin;
