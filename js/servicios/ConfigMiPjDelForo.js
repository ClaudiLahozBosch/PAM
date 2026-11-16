// @ts-check
// «Configurar Mi PJ» dentro del foro: el panel lee la copia que PAM deja en el almacén del agente (`pam.mipj`,
// js/pam/ConfigMiPjAlForo.js). Sin copia (PAM todavía no se abrió con el script), todo como siempre.
import { normalizarConfig } from '../reglas/ConfigMiPj.js?v=2.2.0';

/**
 * @param {{ leerDato: (k: string) => Promise<any> }} agente
 * @param {{ cada?: number, ahora?: () => number }} [op] cada cuánto se puede volver a leer (ms)
 */
export function crearConfigDelForo(agente, { cada = 5000, ahora = () => Date.now() } = {}) {
  let cfg = normalizarConfig(null), texto = JSON.stringify(cfg), leida = -Infinity;
  return {
    /** La última que se leyó (o la de siempre). */
    actual: () => cfg,
    /**
     * Vuelve a leer si pasó un rato (PAM puede haberla cambiado en otra pestaña).
     * @returns {Promise<boolean>} si cambió
     */
    async refrescar(forzar = false) {
      if (!forzar && ahora() - leida < cada) return false;
      leida = ahora();
      let v = null;
      try { v = await agente.leerDato('pam.mipj'); } catch { return false; /* sin almacén: se queda la que había */ }
      const nueva = normalizarConfig(v), t = JSON.stringify(nueva);
      if (t === texto) return false;
      cfg = nueva; texto = t;
      return true;
    }
  };
}
